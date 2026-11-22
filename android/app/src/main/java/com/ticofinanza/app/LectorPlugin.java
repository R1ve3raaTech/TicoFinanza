package com.ticofinanza.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

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

    /** Marca o desmarca un paquete para guardar su contenido. */
    @PluginMethod
    public void capturar(PluginCall call) {
        String pkg = call.getString("pkg");
        if (pkg == null || pkg.isEmpty()) {
            call.reject("Falta el paquete.");
            return;
        }
        Boolean activo = call.getBoolean("activo", Boolean.FALSE);
        AlmacenDeNotificaciones.permitir(getContext(), pkg, Boolean.TRUE.equals(activo));
        call.resolve();
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
