package com.ticofinanza.app;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

/**
 * La actividad del envoltorio.
 *
 * Lo único que agrega sobre la de Capacitor es esconder los saldos de la
 * lista de apps recientes.
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
        super.onCreate(savedInstanceState);
        // Al arrancar la app ya está a la vista: sin bandera, para que una
        // captura salga normal desde el primer momento.
        quitarProteccion();
    }

    @Override
    public void onPause() {
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
}
