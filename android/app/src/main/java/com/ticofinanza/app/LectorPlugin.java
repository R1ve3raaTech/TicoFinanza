package com.ticofinanza.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import androidx.appcompat.app.AlertDialog;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Set;

/**
 * El puente entre la web y el lector de notificaciones.
 *
 * Es un plugin de la propia app, no un paquete de npm, así que no aparece en
 * {@code capacitor.plugins.json} —ese lo genera {@code cap sync} a partir de
 * las dependencias— y se registra a mano en {@code MainActivity}, antes de
 * {@code super.onCreate()}.
 *
 * Del lado del JavaScript se toma con {@code registerPlugin("LectorNotificaciones")},
 * que funciona aunque la app cargue el sitio en vivo: {@code @capacitor/core}
 * viaja dentro del bundle de Next y el objeto que Android inyecta
 * ({@code androidBridge}) está siempre. Ver {@code lib/nativeBridge.ts}.
 */
@CapacitorPlugin(name = "LectorNotificaciones")
public class LectorPlugin extends Plugin {

    /**
     * ¿Está concedido el permiso de leer notificaciones?
     *
     * Este permiso no se pide con un diálogo: hay que activarlo a mano en
     * los ajustes de Android, así que lo único que se puede hacer desde acá
     * es consultarlo y abrir esa pantalla.
     */
    @PluginMethod
    public void permiso(PluginCall call) {
        JSObject salida = new JSObject();
        salida.put("concedido", tienePermiso());
        call.resolve(salida);
    }

    private boolean tienePermiso() {
        try {
            Context ctx = getContext();
            Set<String> habilitados = NotificationManagerCompat.getEnabledListenerPackages(ctx);
            return habilitados.contains(ctx.getPackageName());
        } catch (Exception e) {
            return false;
        }
    }

    /** Abre la pantalla de Android donde se activa el permiso. */
    @PluginMethod
    public void abrirAjustes(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            // Sale de la app, así que necesita su propia tarea.
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir los ajustes de notificaciones de Android.");
        }
    }

    /**
     * Las apps que han notificado, con cuál está marcada para capturar.
     *
     * Esta lista es la que resuelve el problema de no saber el nombre del
     * paquete del banco: aparece sola en cuanto el banco manda un aviso.
     */
    @PluginMethod
    public void apps(PluginCall call) {
        JSObject salida = new JSObject();
        try {
            salida.put("apps", new JSArray(AlmacenDeNotificaciones.appsJson(getContext())));
        } catch (Exception e) {
            salida.put("apps", new JSArray());
        }
        call.resolve(salida);
    }

    /**
     * Marca o desmarca un paquete para guardar su contenido.
     *
     * <h3>Prender cuesta una confirmación nativa; apagar es gratis</h3>
     *
     * El permiso de Android es de todo o nada: una vez concedido, este
     * servicio ve los avisos de <b>toda</b> app del teléfono, y la lista
     * blanca es lo único que decide de cuáles se guarda el texto. O sea que
     * un método que acepte cualquier paquete desde el JavaScript convierte
     * un fallo cualquiera del sitio —un XSS, un script de terceros— en un
     * lector de todas las notificaciones del teléfono: bastaría marcar
     * WhatsApp y leerlo con {@code leer()}. Eso no puede depender solo de
     * que el sitio esté sano.
     *
     * Así que prender pasa por un diálogo <b>del sistema</b>, que el
     * JavaScript no puede dibujar ni contestar, y que nombra la app. Y el
     * paquete tiene que haber notificado antes: marcar uno que nunca
     * apareció en la lista no es algo que nadie pueda querer desde la
     * pantalla.
     *
     * Apagar no pide nada, por el mismo criterio que el cerrojo de la app
     * ({@code weakensLock} en {@code lib/appLock.ts}): si cerrar una puerta
     * costara un trámite, el trámite empujaría a dejarla abierta.
     */
    @PluginMethod
    public void capturar(PluginCall call) {
        String pkg = call.getString("pkg");
        if (pkg == null || pkg.isEmpty()) {
            call.reject("Falta el paquete.");
            return;
        }
        boolean activo = Boolean.TRUE.equals(call.getBoolean("activo", Boolean.FALSE));

        if (!activo) {
            AlmacenDeNotificaciones.permitir(getContext(), pkg, false);
            call.resolve(resultado(false));
            return;
        }

        final String rotulo = AlmacenDeNotificaciones.rotuloVisto(getContext(), pkg);
        if (rotulo == null) {
            call.reject("Esa app todavía no ha mandado ningún aviso.");
            return;
        }

        final Activity actividad = getActivity();
        if (actividad == null) {
            call.reject("No se pudo pedir la confirmación.");
            return;
        }

        actividad.runOnUiThread(() -> {
            try {
                new AlertDialog.Builder(actividad)
                    .setTitle("¿Leer los avisos de " + rotulo + "?")
                    .setMessage(
                        "TicoFinanza va a guardar en este teléfono el texto de las "
                            + "notificaciones de " + rotulo + ", para poder anotar los gastos "
                            + "solo. No sale del teléfono y se puede apagar cuando quieras."
                    )
                    .setPositiveButton("Permitir", (d, w) -> {
                        AlmacenDeNotificaciones.permitir(getContext(), pkg, true);
                        call.resolve(resultado(true));
                    })
                    .setNegativeButton("Cancelar", (d, w) -> call.resolve(resultado(false)))
                    // El botón de atrás o un toque afuera: no se prende, y
                    // la llamada tiene que contestar igual o la pantalla
                    // se queda con el interruptor a medio camino.
                    .setOnCancelListener(d -> call.resolve(resultado(false)))
                    .show();
            } catch (Exception e) {
                call.reject("No se pudo pedir la confirmación.");
            }
        });
    }

    private static JSObject resultado(boolean activo) {
        JSObject salida = new JSObject();
        salida.put("activo", activo);
        return salida;
    }

    /** Lo capturado, de más viejo a más nuevo. */
    @PluginMethod
    public void leer(PluginCall call) {
        JSObject salida = new JSObject();
        try {
            salida.put("items", new JSArray(AlmacenDeNotificaciones.capturadasJson(getContext())));
        } catch (Exception e) {
            salida.put("items", new JSArray());
        }
        call.resolve(salida);
    }

    @PluginMethod
    public void borrar(PluginCall call) {
        AlmacenDeNotificaciones.borrarCapturadas(getContext());
        call.resolve();
    }

    /**
     * Le pide a Android que vuelva a enganchar el servicio.
     *
     * Hace falta porque un {@code NotificationListenerService} se queda
     * desconectado si el sistema lo mata o si el permiso se activó mientras
     * la app estaba abierta: el permiso figura como concedido y no llega ni
     * un aviso. Apagar y prender el componente obliga al sistema a volver a
     * atarlo, y es más barato que pedirle a la persona que reinicie el
     * teléfono — que es el consejo que circula por ahí.
     */
    @PluginMethod
    public void reconectar(PluginCall call) {
        try {
            Context ctx = getContext();
            ComponentName componente = new ComponentName(ctx, LectorDeNotificaciones.class);
            ctx.getPackageManager().setComponentEnabledSetting(
                componente,
                android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                android.content.pm.PackageManager.DONT_KILL_APP
            );
            ctx.getPackageManager().setComponentEnabledSetting(
                componente,
                android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                android.content.pm.PackageManager.DONT_KILL_APP
            );
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo reiniciar el lector.");
        }
    }
}
