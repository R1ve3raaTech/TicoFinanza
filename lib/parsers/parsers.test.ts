import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBacCardPurchase } from "./bacCardPurchase";
import { parseBcrCardPurchase } from "./bcrCardPurchase";
import { parseBnCardPurchase } from "./bnCardPurchase";
import { parseBpCardPurchase } from "./bpCardPurchase";
import { parseDaviviendaCardPurchase } from "./daviviendaCardPurchase";
import { parseMucapCardPurchase } from "./mucapCardPurchase";
import { parsePayPal } from "./paypal";
import { parseSinpeMovil } from "./sinpeMovil";

const ctx = (receivedAt = "2026-01-01T00:00:00.000Z") => ({ receivedAt });

// -----------------------------------------------------------------------
// P0: fecha nunca cae en Date.now() cuando no se puede interpretar.
// -----------------------------------------------------------------------
describe("fecha no interpretable: nunca usa Date.now(), usa receivedAt", () => {
  const email = `
Comprobante de Compra
Comercio: AUTOMERCADO ESCAZU
Fecha: 20 de julio de 2026, 9:11pm
Tipo de Transaccion: COMPRA
Monto: CRC 8450.00
BAC INTERNATIONAL BANK
`;

  it("formato de fecha no reconocido: usa receivedAt, no la hora de ejecución", () => {
    const receivedAt = "2000-01-01T00:00:00.000Z";
    const r = parseBacCardPurchase(email, ctx(receivedAt));
    assert.ok(r, "debe seguir matcheando aunque la fecha no se pueda interpretar");
    assert.equal(r?.transaction_date, receivedAt);
  });

  it("correo sin ningún campo de fecha: usa receivedAt, no explota", () => {
    const receivedAt = "2000-01-01T00:00:00.000Z";
    const sinFecha = email.replace("Fecha: 20 de julio de 2026, 9:11pm\n", "");
    const r = parseBacCardPurchase(sinFecha, ctx(receivedAt));
    assert.equal(r?.transaction_date, receivedAt);
  });

  it("fecha válida en el formato esperado: usa la fecha real del correo, no receivedAt", () => {
    const receivedAt = "2000-01-01T00:00:00.000Z";
    const conFechaValida = email.replace(
      "Fecha: 20 de julio de 2026, 9:11pm",
      "Fecha: Jul. 20, 2026, 21:11"
    );
    const r = parseBacCardPurchase(conFechaValida, ctx(receivedAt));
    assert.notEqual(r?.transaction_date, receivedAt);
    assert.equal(r?.transaction_date, "2026-07-21T03:11:00.000Z");
  });
});

// -----------------------------------------------------------------------
// PayPal: dedupeKey estable + regresión de formatos ya soportados.
// -----------------------------------------------------------------------
describe("PayPal", () => {
  const pagado = `
PayPal
Ha pagado $12,90 USD a UBER EATS
Id. de transaccion
1AB23456CD789012E
Comercio
UBER EATS
Subtotal
$12,90 USD
Total
$12,90 USD
Convertido desde: ₡6.850,00 CRC
`;

  it("captura el 'Id. de transaccion' real como dedupeKey", () => {
    const r = parsePayPal(pagado, ctx("2026-07-24T16:20:00.000Z"));
    assert.equal(r?.dedupeKey, "1AB23456CD789012E");
  });

  it("usa el monto CONVERTIDO a CRC cuando el correo trae 'Convertido desde'", () => {
    const r = parsePayPal(pagado, ctx("2026-07-24T16:20:00.000Z"));
    assert.equal(r?.amount, 6850);
    assert.equal(r?.currency, "CRC");
  });

  it("sin 'Id. de transaccion' no matchea (evita registrar sin identificador estable)", () => {
    const sinId = pagado.replace(/Id\. de transaccion\n.*\n/, "");
    assert.equal(parsePayPal(sinId, ctx()), null);
  });

  it("'Ha autorizado un pago' también se registra (no solo 'Ha pagado')", () => {
    const autorizado = pagado.replace("Ha pagado $12,90 USD a UBER EATS", "Ha autorizado un pago a UBER EATS");
    assert.ok(parsePayPal(autorizado, ctx()));
  });

  it("auth + captura del mismo pago: ambos correos devuelven el MISMO dedupeKey", () => {
    const authEmail = `
PayPal
Ha autorizado un pago a FASTSPRING GAME
Id. de transaccion
SAMETXN001
Comercio
FASTSPRING GAME
Total
$4,99 USD
`;
    const captureEmail = authEmail.replace(
      "Ha autorizado un pago a FASTSPRING GAME",
      "Ha pagado $4,99 USD a FASTSPRING GAME"
    );
    const rAuth = parsePayPal(authEmail, ctx());
    const rCapture = parsePayPal(captureEmail, ctx());
    assert.equal(rAuth?.dedupeKey, "SAMETXN001");
    assert.equal(rCapture?.dedupeKey, "SAMETXN001");
  });
});

// -----------------------------------------------------------------------
// PayPal-routed: mismo helper compartido, guard consistente entre bancos.
// -----------------------------------------------------------------------
describe("compras ruteadas por PayPal: se ignoran en todos los parsers de tarjeta", () => {
  it("BAC ignora 'PP*x'", () => {
    const email = `
Comprobante de Compra
Comercio: PP*FSPRG.COM
Fecha: Jul. 20, 2026, 21:11
Tipo de Transaccion: COMPRA
Monto: USD 4.99
BAC INTERNATIONAL BANK
`;
    assert.equal(parseBacCardPurchase(email, ctx()), null);
  });

  it("BP ignora 'PAYPAL *x' y 'PP*x'", () => {
    const email = `
Comercio: PP*FSPRG.COM
Ciudad y pais: SAN JOSE CR
Fecha: Jul. 20, 2026, 21:11
Visa: 1234
Autorizacion: 000111
Referencia: 999
Tipo de Transaccion: COMPRA
Monto: CRC 3000.00
bp.fi.cr
`;
    assert.equal(parseBpCardPurchase(email, ctx()), null);
  });

  it("Davivienda ignora 'PP*x'", () => {
    const email = `
Davivienda le informa
Comercio: PP*NETFLIX.COM
Fecha: 20/07/2026 21:11
Monto: CRC 5000.00
`;
    assert.equal(parseDaviviendaCardPurchase(email, ctx()), null);
  });

  it("BNCR ignora 'PP*x'", () => {
    const email = `
BN Servicios le notifica una compra
Comercio: PP*NETFLIX.COM
Fecha: 20/07/2026 21:11
Monto: CRC 5000.00
`;
    assert.equal(parseBnCardPurchase(email, ctx()), null);
  });

  it("MUCAP ignora 'PAYPAL *x'", () => {
    const email = `
MUCAP le informa
Comercio: PAYPAL *NETFLIX.COM
Fecha: 20/07/2026 21:11
Monto: CRC 5000.00
`;
    assert.equal(parseMucapCardPurchase(email, ctx()), null);
  });

  it("BCR ignora 'PP*x' en el comercio de la tabla", () => {
    const rowValues = ["20/07/2026 18:15:52", "123456", "REF001", "18,500.00", "COLONES", "PP*NETFLIX.COM", "Aprobada"];
    const email = `SOMOS EL BANCO DE COSTA RICA\nFecha\nAutorizacion\nNo.Referencia\nMonto\nMoneda\nComercio\nEstado\n${rowValues.join("\n")}\nEn caso de dudas comuniquese con nosotros\n`;
    assert.equal(parseBcrCardPurchase(email, ctx()), null);
  });
});

// -----------------------------------------------------------------------
// sinpeMovil (Banco Popular): gate exige señal propia de BP.
// -----------------------------------------------------------------------
describe("sinpeMovil (Banco Popular)", () => {
  const enviado = `
el Banco Popular le informa
Transaccion SINPE Movil
Tipo de Movimiento: Debito
Monto Enviado: 15,000.00
Moneda: CRC
Fecha: 20/07/2026 09:05:58 PM
Nombre Origen: CAMIL RIVERA
Nombre Destino: JUAN PEREZ
Popularenlinea@bp.fi.cr
`;

  it("SINPE Móvil válido de BP: se registra como EXPENSE con el monto correcto", () => {
    const r = parseSinpeMovil(enviado, ctx());
    assert.equal(r?.bank_name, "BP");
    assert.equal(r?.type, "EXPENSE");
    assert.equal(r?.amount, 15000);
  });

  it("correo de otro banco con campos/frase similares (sin señal de BP): NO matchea", () => {
    const bcrEmail = `
Transaccion SINPE MOVIL
se le ha debitado
Nombre cliente Destino: JUAN PEREZ
Monto: 5,000.00
el 20/07/2026 a las 9:05 PM
`;
    assert.equal(parseSinpeMovil(bcrEmail, ctx()), null);
  });

  it("correo incompleto (falta el monto): NO matchea", () => {
    const incompleto = enviado.replace(/Monto Enviado:\s*[\d,.]+/, "");
    assert.equal(parseSinpeMovil(incompleto, ctx()), null);
  });
});

// -----------------------------------------------------------------------
// Falso negativo: BP + NIC (mismo layout de correo que BAC).
// -----------------------------------------------------------------------
describe("BP compra en NIC (córdobas)", () => {
  it("reconoce NIC igual que BAC para el mismo layout de correo", () => {
    const email = `
Comercio: PULPERIA MANAGUA
Ciudad y pais: MANAGUA NI
Fecha: Jul. 20, 2026, 21:11
Visa: 1234
Autorizacion: 000111
Referencia: 999
Tipo de Transaccion: COMPRA
Monto: NIC 500.00
bp.fi.cr
`;
    const r = parseBpCardPurchase(email, ctx());
    assert.equal(r?.currency, "NIO");
    assert.equal(r?.amount, 500);
  });
});

// -----------------------------------------------------------------------
// Falso negativo: BCR con una columna extra no debe perder la transacción.
// -----------------------------------------------------------------------
describe("BCR: tolera columnas nuevas/reordenadas en la tabla", () => {
  const rowValues = ["20/07/2026 18:15:52", "123456", "REF001", "18,500.00", "COLONES", "EPA CURRIDABAT", "Aprobada"];
  const base = `SOMOS EL BANCO DE COSTA RICA\nFecha\nAutorizacion\nNo.Referencia\nMonto\nMoneda\nComercio\nEstado\n${rowValues.join("\n")}\nEn caso de dudas comuniquese con nosotros\n`;

  it("columna nueva ('Cuotas') no rompe el parseo", () => {
    const conCuotas = base
      .replace("Comercio\nEstado\n", "Comercio\nCuotas\nEstado\n")
      .replace("EPA CURRIDABAT\nAprobada", "EPA CURRIDABAT\n1/1\nAprobada");
    const r = parseBcrCardPurchase(conCuotas, ctx());
    assert.ok(r);
    assert.equal(r?.amount, 18500);
    assert.equal(r?.description, "EPA CURRIDABAT");
  });

  it("falta un campo requerido (Comercio): sigue devolviendo null", () => {
    const sinComercio = base.replace("Comercio\n", "").replace("EPA CURRIDABAT\n", "");
    assert.equal(parseBcrCardPurchase(sinComercio, ctx()), null);
  });

  it("estado 'Negada': no se registra", () => {
    const negada = base.replace("Aprobada", "Negada");
    assert.equal(parseBcrCardPurchase(negada, ctx()), null);
  });
});
