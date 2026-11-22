package com.ticofinanza.app;

import android.app.Notification;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Lee las notificaciones del teléfono para poder anotar un gasto solo.
 *
 * <h3>Esta es la fase de captura, y no hay ningún parser todavía</h3>
 *
 * A propósito. El formato de un aviso de banco no se puede adivinar: ya
 * pasó una vez en este proyecto, cuando las compras del Banco Popular se
 * registraban como si fueran del BAC porque las dos usaban el mismo
 * encabezado de tabla y nadie había visto un correo real del segundo.
 * Escribir parsers contra un formato imaginado da exactamente ese bug, con
 * la diferencia de que acá el dato equivocado se mete solo en las cuentas.
 *
 * Así que esto guarda el texto crudo y lo muestra. Los parsers se escriben
 * después, contra avisos de verdad, con pruebas que usen ese texto.
 *
 * <h3>Lo que el sistema le entrega, y lo que este servicio descarta</h3>
 *
 * Android le pasa a un listener <b>todas</b> las notificaciones del
 * teléfono. De eso se descarta:
 *
 * <ul>
 *   <li><b>Las de TicoFinanza.</b> Los recordatorios de gastos fijos los
 *       manda esta misma app; capturarlos sería leerse a sí misma.</li>
 *   <li><b>Los resúmenes de grupo.</b> Android publica una notificación
 *       extra que junta a las demás; su texto es "3 mensajes nuevos" y
 *       duplicaría cada aviso.</li>
 *   <li><b>Las permanentes.</b> Un "reproduciendo música" o un "VPN activa"
 *       se republica sin parar y llenaría la lista.</li>
 *   <li><b>Las que no traen texto.</b> Sin título ni cuerpo no hay nada que
 *       leer.</li>
 * </ul>
 *
 * El contenido <b>solo</b> se guarda si el paquete está en la lista blanca
 * que la persona marcó. De todo lo demás se anota nada más que el nombre de
 * la app, para que esa lista se pueda armar sin adivinar paquetes. La razón
 * entera está en {@link AlmacenDeNotificaciones}.
 */
public class LectorDeNotificaciones extends NotificationListenerService {

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            procesar(sbn);
        } catch (Exception e) {
            // Un aviso raro no puede tumbar el servicio: si se cae, Android
            // lo desactiva y la persona tiene que volver a dar el permiso a
            // mano, sin que nada en pantalla explique por qué dejó de andar.
        }
    }

    private void procesar(StatusBarNotification sbn) {
        if (sbn == null) return;

        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.isEmpty()) return;
        if (pkg.equals(getPackageName())) return;

        Notification n = sbn.getNotification();
        if (n == null) return;

        int flags = n.flags;
        if ((flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        if ((flags & Notification.FLAG_ONGOING_EVENT) != 0) return;

        long cuando = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
        String nombre = rotuloDe(pkg);

        // El registro de la app va SIEMPRE, con o sin permiso de captura:
        // es lo que llena la lista desde la que se eligen los bancos.
        AlmacenDeNotificaciones.registrarApp(this, pkg, nombre, cuando);

        if (!AlmacenDeNotificaciones.permitido(this, pkg)) return;

        Bundle extras = n.extras;
        if (extras == null) return;

        String titulo = texto(extras, Notification.EXTRA_TITLE);

        // **El cuerpo largo primero.** Un aviso de banco casi siempre trae
        // el detalle en `EXTRA_BIG_TEXT` y en `EXTRA_TEXT` una versión
        // recortada con puntos suspensivos. Quedarse con la corta es
        // perder justo el monto o el comercio.
        String cuerpo = texto(extras, Notification.EXTRA_BIG_TEXT);
        if (cuerpo.isEmpty()) cuerpo = texto(extras, Notification.EXTRA_TEXT);
        if (cuerpo.isEmpty()) cuerpo = texto(extras, Notification.EXTRA_SUMMARY_TEXT);

        if (titulo.isEmpty() && cuerpo.isEmpty()) return;

        AlmacenDeNotificaciones.guardar(this, pkg, nombre, titulo, cuerpo, cuando);
    }

    /**
     * Un campo de los extras como texto.
     *
     * Puede venir como {@code String} o como {@code SpannableString} (texto
     * con formato), así que no se puede castear a {@code String}: hay que
     * pasarlo por {@code CharSequence}.
     */
    private static String texto(Bundle extras, String clave) {
        CharSequence valor = extras.getCharSequence(clave);
        if (valor == null) return "";
        return valor.toString().trim();
    }

    /** El nombre que la persona ve en el teléfono, no el del paquete. */
    private String rotuloDe(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            CharSequence rotulo = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0));
            String nombre = rotulo == null ? "" : rotulo.toString().trim();
            return nombre.isEmpty() ? pkg : nombre;
        } catch (Exception e) {
            // Una app desinstalada entre el aviso y esta consulta: el
            // paquete solo ya identifica de quién era.
            return pkg;
        }
    }
}
