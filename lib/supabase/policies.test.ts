import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Toda tabla que la app actualiza tiene que tener política de UPDATE.
 *
 * Esta prueba existe por un bug real: `user_categories` se creó con
 * políticas de SELECT, INSERT y DELETE, y sin la de UPDATE. Con RLS activo
 * eso **no da error**: el UPDATE simplemente no alcanza ninguna fila, así
 * que la app decía "categoría guardada" y no guardaba nada. Un permiso que
 * falta se ve igual que un guardado exitoso.
 *
 * Por eso la comprobación es estructural y no de comportamiento: se cruzan
 * las tablas que el código actualiza contra las políticas declaradas en las
 * migraciones. Agregar una tabla nueva y olvidar su política rompe esta
 * prueba antes de que nadie pierda un dato.
 */

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Tablas que solo se escriben con la clave de servicio (`createAdminClient`),
 * que pasa por encima de RLS a propósito: son de uso interno del servidor y
 * ninguna sesión las toca.
 */
const SERVICE_ROLE_ONLY = new Set([
  // Códigos de borrado de cuenta: los emite y consume el servidor.
  "account_deletion_codes",
  // Límite de intentos por acción: el usuario no debe poder tocarlo.
  "action_rate_limits",
  // Avisos ya mandados, para no repetirlos. Los escribe el cron.
  "push_reminders",
]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) out.push(full);
  }
  return out;
}

/** Las tablas que el código escribe con `.update(` o `.upsert(`. */
function updatedTables(): Set<string> {
  const tables = new Set<string>();
  for (const dir of ["app", "lib"]) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const source = readFileSync(file, "utf8");
      // Desde cada `.from("tabla")` hasta el final de su sentencia: los
      // objetos de un update no llevan `;`, así que el punto y coma marca
      // bien el corte y no se cuela el `.update(` de la sentencia siguiente.
      const pattern = /\.from\("([a-z_]+)"\)([^;]*)/g;
      for (const [, table, chain] of source.matchAll(pattern)) {
        if (/\.(update|upsert)\(/.test(chain)) tables.add(table);
      }
    }
  }
  return tables;
}

/** Las tablas con política de UPDATE declarada en alguna migración. */
function tablesWithUpdatePolicy(): Set<string> {
  const dir = join(ROOT, "supabase", "migrations");
  const tables = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(dir, file), "utf8");
    // `create policy "..." on [public.]tabla for update`
    const pattern = /create\s+policy\s+"[^"]+"\s+on\s+(?:public\.)?([a-z_]+)\s+for\s+update/gi;
    for (const [, table] of sql.matchAll(pattern)) tables.add(table);
  }
  return tables;
}

test("toda tabla que la app actualiza tiene política de UPDATE", () => {
  const updated = updatedTables();
  const allowed = tablesWithUpdatePolicy();

  // Si esto queda vacío es que el escaneo dejó de encontrar nada y la
  // prueba pasaría sin comprobar nada.
  assert.ok(updated.size > 5, `se esperaban varias tablas actualizadas, salieron ${updated.size}`);

  const sinPolitica = [...updated]
    .filter((table) => !SERVICE_ROLE_ONLY.has(table))
    .filter((table) => !allowed.has(table))
    .sort();

  assert.deepEqual(
    sinPolitica,
    [],
    `estas tablas se actualizan desde la app y no tienen política de UPDATE: ${sinPolitica.join(", ")}. ` +
      "Sin ella el UPDATE no falla: no toca ninguna fila y la app cree que guardó."
  );
});

test("user_categories tiene sus cuatro políticas", () => {
  const dir = join(ROOT, "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  for (const accion of ["select", "insert", "update", "delete"]) {
    const pattern = new RegExp(
      `on\\s+(?:public\\.)?user_categories\\s+for\\s+${accion}`,
      "i"
    );
    assert.ok(pattern.test(sql), `falta la política de ${accion.toUpperCase()} de user_categories`);
  }
});
