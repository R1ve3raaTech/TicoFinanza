import { after, it } from "node:test";
import assert from "node:assert/strict";
import { getSupabaseConfig } from "./config";

const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
after(() => {
  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_URL", previousUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", previousKey],
  ]) {
    if (value === undefined) delete process.env[name!];
    else process.env[name!] = value;
  }
});

it("rechaza configuración ausente, marcadores y protocolos no HTTP sin inventar un backend", () => {
  for (const [url, key] of [
    ["", ""], ["[SENSITIVE]", "[SENSITIVE]"],
    ["https://project.supabase.co", "[SENSITIVE]"],
    ["https://project.supabase.co", "your-anon-key"],
    ["file:///project", "test-anon"], ["not-a-url", "test-anon"],
  ]) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
    assert.equal(getSupabaseConfig(), null);
  }
});

it("permite Supabase hospedado y local con configuración válida", () => {
  for (const url of ["https://project.supabase.co", "http://127.0.0.1:54321"]) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
    assert.deepEqual(getSupabaseConfig(), { url, key: "test-anon" });
  }
});
