import { it } from "node:test";
import assert from "node:assert/strict";
import { aguinaldoEstimate, aguinaldoWindow } from "./aguinaldo";

function salary(dayKey: string, amount: number) {
  return { transaction_date: `${dayKey}T12:00:00.000Z`, amount };
}

it("la ventana va del 1.º de diciembre del año anterior al 30 de noviembre", () => {
  assert.deepEqual(aguinaldoWindow("2026-11-01"), {
    year: 2026,
    from: "2025-12-01",
    to: "2026-11-30",
  });
});

it("en diciembre la ventana sigue siendo la que cerró: es el pago que está por llegar", () => {
  assert.deepEqual(aguinaldoWindow("2026-12-10"), {
    year: 2026,
    from: "2025-12-01",
    to: "2026-11-30",
  });
});

it("el aguinaldo es lo acumulado entre doce", () => {
  const rows = [];
  // Doce meses de 600.000: el aguinaldo es un salario completo.
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(Date.UTC(2025, 11 + i, 15));
    rows.push(
      salary(
        `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-15`,
        600_000
      )
    );
  }
  const result = aguinaldoEstimate(rows, "2026-11-30");
  assert.equal(result.accrued, 7_200_000);
  assert.equal(result.estimate, 600_000);
  assert.equal(result.monthsRecorded, 12);
});

it("deja fuera lo que cae antes o después de la ventana", () => {
  const result = aguinaldoEstimate(
    [
      salary("2025-11-30", 999_999), // un día antes
      salary("2025-12-01", 500_000), // primer día
      salary("2026-11-30", 500_000), // último día
      salary("2026-12-01", 999_999), // un día después: ya es del año que viene
    ],
    "2026-12-05"
  );
  assert.equal(result.accrued, 1_000_000);
});

it("proyecta con el promedio de lo anotado, no con lo acumulado a secas", () => {
  // Tres meses de 600.000 anotados: si el resto se parece, el aguinaldo
  // va a ser 600.000, aunque hoy lo acumulado solo dé 150.000.
  const result = aguinaldoEstimate(
    [salary("2026-01-15", 600_000), salary("2026-02-15", 600_000), salary("2026-03-15", 600_000)],
    "2026-03-20"
  );
  assert.equal(result.estimate, 150_000);
  assert.equal(result.projected, 600_000);
  assert.equal(result.monthsRecorded, 3);
});

it("sin salario anotado no inventa una proyección", () => {
  const result = aguinaldoEstimate([], "2026-06-01");
  assert.equal(result.estimate, 0);
  assert.equal(result.projected, 0);
  assert.equal(result.monthsRecorded, 0);
});

it("los meses de la ventana arrancan en diciembre y son doce", () => {
  const { months } = aguinaldoEstimate([], "2026-11-01");
  assert.equal(months.length, 12);
  assert.equal(months[0].monthKey, "2025-12");
  assert.equal(months[11].monthKey, "2026-11");
});

it("el mes que corre no cuenta como cerrado: un mes a medias no es un hueco", () => {
  const { months, monthsElapsed } = aguinaldoEstimate([], "2026-03-10");
  assert.equal(monthsElapsed, 3); // dic, ene y feb; marzo va por la mitad
  assert.equal(months[3].monthKey, "2026-03");
  assert.equal(months[3].closed, false);
  assert.equal(months[3].current, true);
  assert.equal(months[4].closed, false);
  assert.equal(months[4].current, false);
});

it("dos pagos en el mismo mes se suman en ese mes", () => {
  const { months } = aguinaldoEstimate(
    [salary("2026-05-15", 300_000), salary("2026-05-30", 300_000)],
    "2026-06-01"
  );
  const mayo = months.find((m) => m.monthKey === "2026-05");
  assert.equal(mayo?.amount, 600_000);
});

it("las etiquetas de mes no se corren por el huso: la primera es diciembre", () => {
  // Date.UTC arma medianoche UTC, que en Costa Rica son las 6 p.m. del día
  // anterior. Sin fijar la zona al formatear, las doce etiquetas salían un
  // mes atrás de su monthKey.
  const { months } = aguinaldoEstimate([], "2026-11-01");
  assert.match(months[0].label, /^dic/);
  assert.equal(months[0].monthKey, "2025-12");
  assert.match(months[1].label, /^ene/);
  assert.match(months[11].label, /^nov/);
});

/**
 * **El salario se paga a fin de mes, que es justo cuando esto fallaba.**
 *
 * `transaction_date` es `timestamptz` y baja en UTC. Un salario anotado el
 * 30 de noviembre a las 7 de la tarde de Costa Rica llega como
 * "2026-12-01T01:00:00Z": cortando la cadena a diez caracteres daba el 1.º
 * de diciembre, que está **fuera de la ventana del aguinaldo** — así que
 * esa quincena desaparecía del total sin dejar rastro.
 */
it("un salario del último día de la ventana, por la tarde, sigue contando", () => {
  // 30 de noviembre, 7 p.m. en Costa Rica = 1 de diciembre 01:00 UTC.
  const tarde = "2026-12-01T01:00:00.000Z";
  const a = aguinaldoEstimate([{ transaction_date: tarde, amount: 600_000 }], "2026-12-05");

  assert.equal(a.accrued, 600_000, "el salario del 30 por la tarde cuenta");
  const noviembre = a.months.find((m) => m.monthKey === "2026-11");
  assert.equal(noviembre?.amount, 600_000, "y cae en noviembre, no en diciembre");
});

/** El mismo caso en un mes cualquiera: el mes de la tira tiene que ser el real. */
it("un salario de fin de mes por la tarde cae en su mes, no en el siguiente", () => {
  // 31 de marzo, 8 p.m. en Costa Rica = 1 de abril 02:00 UTC.
  const tarde = "2026-04-01T02:00:00.000Z";
  const a = aguinaldoEstimate([{ transaction_date: tarde, amount: 450_000 }], "2026-06-15");

  assert.equal(a.months.find((m) => m.monthKey === "2026-03")?.amount, 450_000);
  assert.equal(a.months.find((m) => m.monthKey === "2026-04")?.amount, 0);
});

/** Y de día no cambia nada: el arreglo no corre las fechas normales. */
it("un salario de media mañana queda donde estaba", () => {
  const a = aguinaldoEstimate(
    [{ transaction_date: "2026-05-15T16:00:00.000Z", amount: 500_000 }],
    "2026-06-15"
  );
  assert.equal(a.months.find((m) => m.monthKey === "2026-05")?.amount, 500_000);
});
