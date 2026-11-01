// Genera el par de claves VAPID que necesitan los recordatorios push.
//
//   node scripts/generate-vapid-keys.mjs
//
// Se corre UNA vez. Las claves van a .env.local y a las variables de entorno
// de Vercel (Production y Preview). Si la privada se cambia después, todas
// las suscripciones que ya existen quedan inservibles y cada dispositivo
// tiene que volver a activar los recordatorios desde Ajustes.
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Pegá esto en .env.local y en las variables de entorno de Vercel:

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:thecamil999@gmail.com

La pública se expone al navegador a propósito (va en la suscripción).
La privada NO: es la que firma los envíos.
`);
