// Loader de Node (customization hooks) usado SOLO para correr los tests con
// `node --experimental-strip-types --import ./test/ts-loader.mjs`.
//
// Resuelve dos cosas que Node no hace de forma nativa pero que sí resuelve
// el bundler de Next.js (moduleResolution "bundler" en tsconfig.json):
//   1. Imports relativos sin extensión ("./types" -> "./types.ts").
//   2. El alias "@/..." (-> raíz del repo).
// Y además reemplaza "server-only" (paquete que explota a propósito si se
// importa fuera de un Server Component) por un módulo vacío — solo en este
// loader de tests, nunca en el build real de la app.
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Node no usa los exports resolve/load de abajo automáticamente solo por
// pasar este archivo a --import: hay que registrarlos como hooks explícitamente.
register(import.meta.url, import.meta.url);

const ROOT_URL = pathToFileURL(path.resolve(import.meta.dirname, "..") + path.sep).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "server-only-stub:empty", shortCircuit: true };
  }

  const isAlias = specifier.startsWith("@/");
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (!isAlias && !isRelative) {
    return nextResolve(specifier, context);
  }

  const target = isAlias ? ROOT_URL + specifier.slice(2) : specifier;
  const hasExtension = /\.[cm]?[jt]sx?$/.test(target);
  const candidates = hasExtension ? [target] : [`${target}.ts`, `${target}.tsx`, `${target}/index.ts`];

  let lastError;
  for (const candidate of candidates) {
    try {
      return await nextResolve(candidate, context);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function load(url, context, nextLoad) {
  if (url === "server-only-stub:empty") {
    return { format: "module", source: "export {};", shortCircuit: true };
  }
  return nextLoad(url, context);
}
