package com.ticofinanza.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

/**
 * La actividad del envoltorio.
 *
 * Agrega cuatro cosas sobre la de Capacitor: registrar el plugin del lector
 * de notificaciones, guardar la sesión antes de que Android se lleve la app,
 * esconder los saldos de la lista de recientes, y pintar el fondo del mismo
 * negro que la web.
 *
 * <h3>Por qué hay que guardar las cookies a mano</h3>
 *
 * La sesión de TicoFinanza vive en cookies que pone el servidor. El WebView
 * de Android las acepta y las guarda en disco, pero **no de inmediato**:
 * las mantiene en memoria y las vuelca cada tanto, por su cuenta. Si el
 * sistema mata el proceso antes de ese volcado —que es exactamente lo que
 * pasa al deslizar la app fuera de la lista de recientes, o cuando Android
 * necesita memoria— lo que no alcanzó a bajar a disco se pierde.
 *
 * El síntoma era ese: salir de la app y volver a entrar pedía iniciar
 * sesión otra vez, aunque nadie hubiera cerrado nada. Y arrastraba al
 * cerrojo: sin sesión no se dibuja el panel, así que el cerrojo no llegaba
 * ni a montarse y la huella no se pedía nunca.
 *
 * {@code flush()} fuerza el volcado. Va en {@code onPause} porque es el
 * último momento garantizado antes de que la app deje de estar al frente:
 * {@code onStop} y {@code onDestroy} pueden no llegar a correr si el
 * sistema tiene prisa.
 *
 * <h3>Por qué FLAG_SECURE va y viene, en vez de quedarse puesta</h3>
 *
 * Android guarda una miniatura de la última pantalla para dibujarla en la
 * lista de recientes. En TicoFinanza esa foto es el resumen: el saldo, lo
 * que entró y lo que salió, legible por cualquiera que agarre el teléfono
 * y toque el botón de cambiar de app — sin pasar por el cerrojo, que para
 * entonces ni se enteró.
 *
 * {@code FLAG_SECURE} evita esa captura. Pero puesta de forma permanente
 * (que es como se explica en todos lados) **también prohíbe las capturas de
 * pantalla normales**, y eso tiene un costo real: es como se reportan los
 * problemas. Toda esta app se depuró con capturas que Camil fue mandando;
 * una app de la que no se puede sacar una foto es una app sobre la que no
 * se puede contar qué está fallando.
 *
 * Así que se pone al salir ({@code onPause}) y se quita al volver
 * ({@code onResume}). La miniatura se toma justamente cuando la app se va a
 * segundo plano, así que queda en blanco; estando la app a la vista, la
 * bandera no está y una captura sale normal.
 *
 * <p>Lo que esto **no** hace: proteger la pantalla de quien la está mirando
 * por encima del hombro, ni de una grabación hecha desde otro aparato. No
 * es ese el problema que resuelve.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // **Antes de super, obligatoriamente.** `BridgeActivity.onCreate`
        // arma el puente con los plugins que ya estén registrados; uno
        // agregado después no existe para el JavaScript, y la llamada se
        // queda esperando sin dar error.
        //
        // Este es un plugin de la propia app, no un paquete de npm, así que
        // no lo registra `cap sync`: va acá a mano.
        registerPlugin(LectorPlugin.class);

        super.onCreate(savedInstanceState);
        // Al arrancar la app ya está a la vista: sin bandera, para que una
        // captura salga normal desde el primer momento.
        quitarProteccion();
        pintarFondo();
    }

    @Override
    public void onPause() {
        // Lo primero: que la sesión quede en disco pase lo que pase después.
        guardarCookies();
        // Se pone ANTES de llamar a super: el sistema puede tomar la
        // miniatura apenas la actividad empieza a pausarse, y una bandera
        // puesta después llegaría tarde.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        quitarProteccion();
    }

    private void quitarProteccion() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    private void guardarCookies() {
        try {
            CookieManager.getInstance().flush();
        } catch (Exception e) {
            // Que no se pueda guardar la sesión no es motivo para tumbar la
            // app justo cuando se está yendo a segundo plano: lo peor que
            // pasa es tener que volver a entrar.
        }
    }

    /**
     * El fondo del WebView, del mismo negro que el tema de la ventana.
     *
     * El tema ya pinta la ventana, pero el WebView dibuja encima con su
     * propio color —blanco de fábrica— y eso se ve como un destello claro
     * mientras la página todavía no cargó, que en una app oscura es lo
     * primero que se nota al abrirla.
     */
    private void pintarFondo() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#0A0A0B"));
        }
    }
}
