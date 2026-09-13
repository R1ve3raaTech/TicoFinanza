// Genera los íconos de marca a partir del símbolo: PWA (any + maskable),
// apple-touch, favicon (.ico y .svg) y el badge monocromo de las
// notificaciones push. Correr desde la raíz del proyecto:
//
//   node scripts/generate-brand-icons.mjs
//
// La geometría es la de components/brand/BrandMark.tsx y
// public/brand/mark.svg — si cambia el símbolo, cambiar los tres lugares y
// volver a correr esto. Usa el Chromium de Playwright para rasterizar.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const TILE = "#0b0b0d";
const INK = "#f4f4f5";
const ACCENT = "#38bdf8";

// Símbolo en grilla de 24 (el mismo del componente).
function mark(fg, accent) {
  return (
    `<path d="M10.5 2.5H21.5V7.5H10.5A2.5 2.5 0 0 1 10.5 2.5Z" fill="${fg}"/>` +
    `<rect x="2.5" y="9.5" width="13" height="5" fill="${fg}"/>` +
    `<rect x="17.5" y="9.5" width="4" height="5" fill="${accent}"/>` +
    `<rect x="2.5" y="16.5" width="19" height="5" fill="${fg}"/>`
  );
}

// Versión en grilla de píxeles para 16 y 32 px: a ese tamaño la curva y los
// medios píxeles de la versión normal se empastan. Ocupa el cuadro 3..13.
function pixelMark(fg, accent) {
  return (
    `<rect x="7" y="3" width="6" height="2" fill="${fg}"/>` +
    `<rect x="3" y="7" width="6" height="2" fill="${fg}"/>` +
    `<rect x="11" y="7" width="2" height="2" fill="${accent}"/>` +
    `<rect x="3" y="11" width="10" height="2" fill="${fg}"/>`
  );
}

function iconSvg({ size, markRatio, radius = 0, pixel = false, bg = TILE, fg = INK, accent = ACCENT }) {
  const m = size * markRatio;
  const off = (size - m) / 2;
  const inner = pixel
    ? `<svg x="${off}" y="${off}" width="${m}" height="${m}" viewBox="3 3 10 10" shape-rendering="crispEdges">${pixelMark(fg, accent)}</svg>`
    : `<svg x="${off}" y="${off}" width="${m}" height="${m}" viewBox="2.5 2.5 19 19">${mark(fg, accent)}</svg>`;
  const tile = bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${tile}${inner}</svg>`;
}

/** Arma un .ico con PNGs adentro (formato soportado por todos los navegadores). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function rasterize(svg) {
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`
  );
  return page.locator("svg").first().screenshot({ omitBackground: true });
}

const outputs = {
  // Cuadrados a sangre: el sistema operativo les pone su propia máscara.
  "public/icon-192.png": iconSvg({ size: 192, markRatio: 0.5 }),
  "public/icon-512.png": iconSvg({ size: 512, markRatio: 0.5 }),
  // Maskable: el símbolo tiene que caber en el círculo seguro del 80%.
  "public/icon-maskable-512.png": iconSvg({ size: 512, markRatio: 0.42 }),
  "public/apple-touch-icon.png": iconSvg({ size: 180, markRatio: 0.5 }),
  // Badge de Android: solo cuenta el canal alfa, así que va blanco y sin fondo.
  "public/badge-96.png": iconSvg({ size: 96, markRatio: 0.72, bg: null, fg: "#ffffff", accent: "#ffffff" }),
};

for (const [path, svg] of Object.entries(outputs)) {
  writeFileSync(path, await rasterize(svg));
  console.log("ok", path);
}

const ico = buildIco([
  { size: 16, png: await rasterize(iconSvg({ size: 16, markRatio: 10 / 16, radius: 3, pixel: true })) },
  { size: 32, png: await rasterize(iconSvg({ size: 32, markRatio: 20 / 32, radius: 6, pixel: true })) },
  { size: 48, png: await rasterize(iconSvg({ size: 48, markRatio: 0.58, radius: 10 })) },
]);
writeFileSync("app/favicon.ico", ico);
console.log("ok", "app/favicon.ico");

mkdirSync("public/brand", { recursive: true });
writeFileSync("public/icon.svg", iconSvg({ size: 32, markRatio: 0.6, radius: 7 }));
console.log("ok", "public/icon.svg");

await browser.close();
