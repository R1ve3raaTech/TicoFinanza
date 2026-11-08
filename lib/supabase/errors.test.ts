import { it } from "node:test";
import assert from "node:assert/strict";
import { isMissingColumnError } from "./errors";

it("reconoce el rechazo de PostgREST, que es el caso real al escribir", () => {
  assert.ok(
    isMissingColumnError({
      code: "PGRST204",
      message: "Could not find the 'icon' column of 'user_categories' in the schema cache",
    })
  );
});

it("reconoce también el error de Postgres", () => {
  assert.ok(isMissingColumnError({ code: "42703", message: 'column "icon" does not exist' }));
});

it("lo reconoce por el mensaje aunque el código venga raro", () => {
  assert.ok(isMissingColumnError({ code: null, message: "… in the schema cache" }));
  assert.ok(isMissingColumnError({ code: "XX000", message: 'column "color" does not exist' }));
});

it("no confunde otros errores con una migración pendiente", () => {
  assert.equal(isMissingColumnError({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isMissingColumnError({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingColumnError(null), false);
});
