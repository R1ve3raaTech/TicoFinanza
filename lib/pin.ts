import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Hash del PIN del cerrojo. **Nunca se guarda el PIN.**
 *
 * Es `scrypt`, que viene en Node: no hace falta sumar una dependencia para
 * esto. Está hecho para ser lento a propósito, que es justo lo que se pide
 * de un hash de contraseña — con un espacio de cinco dígitos, un hash
 * rápido (sha256) se recorre entero en un suspiro.
 *
 * La sal es nueva en cada PIN, así que dos personas con el mismo PIN no
 * comparten hash.
 *
 * El formato lleva el algoritmo adelante (`scrypt$sal$hash`) para poder
 * cambiarlo más adelante sin tener que adivinar qué es cada fila.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(pin, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * ¿Este PIN corresponde a ese hash?
 *
 * La comparación es de tiempo constante (`timingSafeEqual`): con una
 * comparación normal, cuánto tarda en contestar que no filtra cuántos
 * caracteres acertaste.
 *
 * Devuelve `false` ante cualquier formato que no entienda en vez de tirar:
 * una fila escrita por una versión futura no debe dejar a nadie trabado en
 * la pantalla de cerrojo.
 */
export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scryptAsync(pin, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}
