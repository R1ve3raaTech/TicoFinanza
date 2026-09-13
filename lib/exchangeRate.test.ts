import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { convertToCRC, ExchangeRateError } from "./exchangeRate";

const originalFetch = globalThis.fetch;

function mockRates(rates: Record<string, number>, result: "success" | "error" = "success") {
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ result, rates }),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("convertToCRC", () => {
  it("CRC no llama a la API y devuelve el mismo monto (evita doble conversión)", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return { ok: true, json: async () => ({ result: "success", rates: { USD: 1, CRC: 520 } }) };
    }) as unknown as typeof fetch;
    const result = await convertToCRC(4200, "CRC");
    assert.equal(result, 4200);
    assert.equal(calls, 0);
  });

  it("USD se convierte usando la tasa CRC/USD de la API", async () => {
    mockRates({ USD: 1, CRC: 520 });
    const result = await convertToCRC(100, "USD");
    assert.equal(result, 52000);
  });

  it("EUR se convierte pasando por USD", async () => {
    mockRates({ USD: 1, CRC: 520, EUR: 0.9 });
    const result = await convertToCRC(9.99, "EUR");
    assert.equal(result, Math.round((9.99 / 0.9) * 520));
  });

  it("NIO (NIC) se convierte pasando por USD", async () => {
    mockRates({ USD: 1, CRC: 520, NIO: 36.6 });
    const result = await convertToCRC(366, "NIC");
    assert.equal(result, 5200);
  });

  it("API caída (fetch rechaza): tira ExchangeRateError, nunca inventa un monto", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
  });

  it("Respuesta inválida (result !== 'success'): tira ExchangeRateError", async () => {
    mockRates({ USD: 1, CRC: 520 }, "error");
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
  });

  it("Tasa CRC 0: tira ExchangeRateError (nunca divide por cero ni inventa)", async () => {
    mockRates({ USD: 1, CRC: 0 });
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
  });

  it("Tasa CRC NaN: tira ExchangeRateError", async () => {
    mockRates({ USD: 1, CRC: Number.NaN });
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
  });

  it("Tasa CRC absurda (fuera de la banda de cordura 200-1500): tira ExchangeRateError", async () => {
    mockRates({ USD: 1, CRC: 999999 });
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
  });

  it("Timeout de la API: tira ExchangeRateError sin colgar el proceso", async () => {
    globalThis.fetch = ((_url: string, opts?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as unknown as typeof fetch;
    const start = Date.now();
    await assert.rejects(() => convertToCRC(100, "USD"), ExchangeRateError);
    assert.ok(Date.now() - start < 15_000, "debe respetar el timeout interno, no colgar indefinidamente");
  });

  it("Moneda desconocida (la API no la reporta): tira ExchangeRateError", async () => {
    mockRates({ USD: 1, CRC: 520 });
    await assert.rejects(() => convertToCRC(100, "XYZ"), ExchangeRateError);
  });

  it("Doble conversión: convertir un monto ya en CRC no vuelve a llamar la API", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return { ok: true, json: async () => ({ result: "success", rates: { USD: 1, CRC: 520 } }) };
    }) as unknown as typeof fetch;
    const first = await convertToCRC(100, "USD");
    const second = await convertToCRC(first, "CRC");
    assert.equal(second, first);
    assert.equal(calls, 1);
  });
});
