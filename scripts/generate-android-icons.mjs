// Íconos y splash del APK de Android, a partir del símbolo de la marca.
// Correr desde la raíz del proyecto, después de `npx cap add android`:
//
//   node scripts/generate-android-icons.mjs
//
// Reemplaza los que trae la plantilla de Capacitor, que son el logo de
// Capacitor: sin esto, la app instalada se ve con el ícono de otra cosa.
//
// La geometría es la misma de components/brand/BrandMark.tsx,
// public/brand/mark.svg y scripts/generate-brand-icons.mjs — si cambia el
// símbolo hay que cambiarla en los cuatro lugares y volver a correr los dos
// scripts. Rasteriza con el Chromium de Playwright, igual que el otro.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const TILE = "#0b0b0d";
const INK = "#f4f4f5";
const ACCENT = "#38bdf8";

/** El símbolo en grilla de 24, idéntico al del componente. */
function mark(fg, accent) {
  return (
    `<path d="M10.5 2.5H21.5V7.5H10.5A2.5 2.5 0 0 1 10.5 2.5Z" fill="${fg}"/>` +
    `<rect x="2.5" y="9.5" width="13" height="5" fill="${fg}"/>` +
    `<rect x="17.5" y="9.5" width="4" height="5" fill="${accent}"/>` +
    `<rect x="2.5" y="16.5" width="19" height="5" fill="${fg}"/>`
  );
}

/**
 * `inset` es cuánto del lienzo ocupa el símbolo.
 *
 * En el ícono adaptativo (`foreground`) tiene que ser chico: Android
 * recorta ese lienzo con la forma que tenga el launcher —círculo, cuadrado
 * redondeado, gota— y solo garantiza el 66 % del centro. Con el símbolo a
 * tamaño completo, los bordes se comen las barras.
 */
function svg(size, { inset, background }) {
  const lado = size * inset;
  const margen = (size - lado) / 2;
  const fondo = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${fondo}
    <g transform="translate(${margen} ${margen}) scale(${lado / 24})">${mark(INK, ACCENT)}</g>
  </svg>`;
}

const RES = "android/app/src/main/res";

// Densidades del ícono del launcher. El adaptativo (foreground) usa un
// lienzo de 108dp, que es 2,25 veces el de 48dp.
const DENSIDADES = [
  { dir: "mipmap-mdpi", icon: 48 },
  { dir: "mipmap-hdpi", icon: 72 },
  { dir: "mipmap-xhdpi", icon: 96 },
  { dir: "mipmap-xxhdpi", icon: 144 },
  { dir: "mipmap-xxxhdpi", icon: 192 },
];

// El splash se estira a pantalla completa, así que va cuadrado y grande.
const SPLASH = [
  { dir: "drawable", size: 480 },
  ...["port", "land"].flatMap((orient) =>
    [
      ["mdpi", 320],
      ["hdpi", 480],
      ["xhdpi", 720],
      ["xxhdpi", 960],
      ["xxxhdpi", 1280],
    ].map(([d, size]) => ({ dir: `drawable-${orient}-${d}`, size }))
  ),
];

const browser = await chromium.launch();
const page = await browser.newPage();

async function png(markup, size, destino) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>${markup}`
  );
  const buffer = await page.screenshot({ omitBackground: true });
  mkdirSync(destino.slice(0, destino.lastIndexOf("/")), { recursive: true });
  writeFileSync(destino, buffer);
}

for (const { dir, icon } of DENSIDADES) {
  // Clásico y redondo: el símbolo sobre su propio azulejo oscuro.
  const clasico = svg(icon, { inset: 0.62, background: TILE });
  await png(clasico, icon, `${RES}/${dir}/ic_launcher.png`);
  await png(clasico, icon, `${RES}/${dir}/ic_launcher_round.png`);

  // Adaptativo: lienzo de 108dp, fondo aparte (ic_launcher_background).
  const adaptativo = Math.round(icon * 2.25);
  await png(svg(adaptativo, { inset: 0.42 }), adaptativo, `${RES}/${dir}/ic_launcher_foreground.png`);
}

for (const { dir, size } of SPLASH) {
  await png(svg(size, { inset: 0.26, background: TILE }), size, `${RES}/${dir}/splash.png`);
}

// El fondo del ícono adaptativo venía en blanco: con el símbolo en tinta
// clara, quedaba invisible.
writeFileSync(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${TILE}</color>\n</resources>\n`
);

await browser.close();
console.log(`Listo: ${DENSIDADES.length * 3} íconos y ${SPLASH.length} splash.`);
