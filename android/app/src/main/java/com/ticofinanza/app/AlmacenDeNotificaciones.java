package com.ticofinanza.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;

/**
 * Dónde quedan las notificaciones capturadas.
 *
 * <h3>Todo se queda en el teléfono</h3>
 *
 * No hay tabla en Supabase ni llamada al servidor. El texto de una
 * notificación bancaria trae el comercio, el monto y a veces los últimos
 * dígitos de la tarjeta: mandarlo a un servidor para después decidir si
 * sirve sería subir datos de cuenta antes de saber si hacen falta. Vive en
 * {@code SharedPreferences} y la persona decide qué copiar y a dónde.
 *
 * <h3>Dos cosas distintas, y la diferencia es la que protege</h3>
 *
 * <ul>
 *   <li><b>Las apps vistas</b>: solo el nombre del paquete, su rótulo y
 *       cuántas veces notificó. Se registra de <b>toda</b> app, porque es la
 *       única forma de que la persona encuentre cuál es la de su banco sin
 *       que nadie adivine nombres de paquetes.</li>
 *   <li><b>El contenido</b>: solo de los paquetes que la persona marcó a
 *       mano.</li>
 * </ul>
 *
 * Un {@code NotificationListenerService} ve <b>todo</b> lo que llega al
 * teléfono: WhatsApp, Signal, el correo. Guardar eso aunque sea en local no
 * tiene defensa, y de nada serviría: lo que se busca son avisos de plata.
 * Por eso el contenido va por lista blanca y nunca al revés.
 */
final class AlmacenDeNotificaciones {

    private static final String PREFS = "tf_lector";
    private static final String CAPTURADAS = "capturadas";
    private static final String PERMITIDOS = "permitidos";
    private static final String VISTOS = "vistos";

    /**
     * Tope de notificaciones guardadas. Es una cola: al llegar la 301 se va
     * la más vieja. Sin tope, un aviso que se republica seguido llena las
     * preferencias, que no están hechas para crecer sin freno.
     */
    private static final int MAXIMO = 300;

    /**
     * Android vuelve a publicar la misma notificación cada vez que cambia
     * cualquier cosa de ella. Dos iguales seguidas dentro de este rato son
     * la misma, no dos compras.
     */
    private static final long VENTANA_REPETIDO_MS = 60000L;

    /** Las escrituras vienen del hilo del servicio y las lecturas del puente. */
    private static final Object CANDADO = new Object();

    private AlmacenDeNotificaciones() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONArray arreglo(SharedPreferences p, String clave) {
        try {
            return new JSONArray(p.getString(clave, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static JSONObject objeto(SharedPreferences p, String clave) {
        try {
            return new JSONObject(p.getString(clave, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** Anota que este paquete notificó. Sin nada del contenido. */
    static void registrarApp(Context ctx, String pkg, String nombre, long cuando) {
        synchronized (CANDADO) {
            SharedPreferences p = prefs(ctx);
            JSONObject vistos = objeto(p, VISTOS);
            try {
                JSONObject app = vistos.optJSONObject(pkg);
                if (app == null) app = new JSONObject();
                app.put("nombre", nombre);
                app.put("vistas", app.optInt("vistas", 0) + 1);
                app.put("ultima", cuando);
                vistos.put(pkg, app);
                p.edit().putString(VISTOS, vistos.toString()).apply();
            } catch (Exception ignored) {
                // Perder el conteo de una app no vale tumbar el servicio.
            }
        }
    }

    /**
     * El rótulo guardado de un paquete que ya notificó, o null si nunca
     * notificó.
     *
     * Devolver null es lo que hace que no se pueda marcar un paquete que la
     * persona nunca vio en la lista: ver {@code LectorPlugin.capturar}.
     */
    static String rotuloVisto(Context ctx, String pkg) {
        synchronized (CANDADO) {
            JSONObject app = objeto(prefs(ctx), VISTOS).optJSONObject(pkg);
            if (app == null) return null;
            String nombre = app.optString("nombre", "").trim();
            return nombre.isEmpty() ? pkg : nombre;
        }
    }

    static boolean permitido(Context ctx, String pkg) {
        synchronized (CANDADO) {
            JSONArray lista = arreglo(prefs(ctx), PERMITIDOS);
            for (int i = 0; i < lista.length(); i++) {
                if (pkg.equals(lista.optString(i))) return true;
            }
            return false;
        }
    }

    static void permitir(Context ctx, String pkg, boolean activo) {
        synchronized (CANDADO) {
            SharedPreferences p = prefs(ctx);
            JSONArray lista = arreglo(p, PERMITIDOS);
            JSONArray nueva = new JSONArray();
            for (int i = 0; i < lista.length(); i++) {
                String actual = lista.optString(i);
                if (actual != null && !actual.isEmpty() && !pkg.equals(actual)) {
                    nueva.put(actual);
                }
            }
            if (activo) nueva.put(pkg);
            p.edit().putString(PERMITIDOS, nueva.toString()).apply();
        }
    }

    /**
     * Guarda una notificación, si no es una repetición de la anterior.
     *
     * @return true si de verdad se guardó.
     */
    static boolean guardar(
        Context ctx,
        String pkg,
        String nombre,
        String titulo,
        String texto,
        long cuando
    ) {
        synchronized (CANDADO) {
            SharedPreferences p = prefs(ctx);
            JSONArray lista = arreglo(p, CAPTURADAS);

            // La última es la más reciente: si es idéntica y de hace un
            // momento, Android está republicando la misma.
            JSONObject ultima = lista.length() > 0 ? lista.optJSONObject(lista.length() - 1) : null;
            if (ultima != null
                && pkg.equals(ultima.optString("pkg"))
                && titulo.equals(ultima.optString("titulo"))
                && texto.equals(ultima.optString("texto"))
                && cuando - ultima.optLong("cuando") < VENTANA_REPETIDO_MS) {
                return false;
            }

            try {
                JSONObject item = new JSONObject();
                item.put("pkg", pkg);
                item.put("app", nombre);
                item.put("titulo", titulo);
                item.put("texto", texto);
                item.put("cuando", cuando);
                lista.put(item);

                // Cola: se van las más viejas, que están al principio.
                while (lista.length() > MAXIMO) {
                    lista.remove(0);
                }

                p.edit().putString(CAPTURADAS, lista.toString()).apply();
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }

    static String capturadasJson(Context ctx) {
        synchronized (CANDADO) {
            return arreglo(prefs(ctx), CAPTURADAS).toString();
        }
    }

    static String appsJson(Context ctx) {
        synchronized (CANDADO) {
            SharedPreferences p = prefs(ctx);
            JSONObject vistos = objeto(p, VISTOS);
            JSONArray permitidos = arreglo(p, PERMITIDOS);
            JSONArray salida = new JSONArray();
            Iterator<String> claves = vistos.keys();
            while (claves.hasNext()) {
                String pkg = claves.next();
                JSONObject app = vistos.optJSONObject(pkg);
                if (app == null) continue;
                try {
                    boolean marcado = false;
                    for (int i = 0; i < permitidos.length(); i++) {
                        if (pkg.equals(permitidos.optString(i))) {
                            marcado = true;
                            break;
                        }
                    }
                    JSONObject fila = new JSONObject();
                    fila.put("pkg", pkg);
                    fila.put("nombre", app.optString("nombre", pkg));
                    fila.put("vistas", app.optInt("vistas", 0));
                    fila.put("ultima", app.optLong("ultima", 0));
                    fila.put("capturando", marcado);
                    salida.put(fila);
                } catch (Exception ignored) {
                    // Una fila que no se puede armar se omite; el resto sirve.
                }
            }
            return salida.toString();
        }
    }

    static void borrarCapturadas(Context ctx) {
        synchronized (CANDADO) {
            prefs(ctx).edit().putString(CAPTURADAS, "[]").apply();
        }
    }
}
