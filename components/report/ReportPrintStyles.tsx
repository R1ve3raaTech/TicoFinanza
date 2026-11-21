/**
 * Estilos de impresión del reporte. Van acá y no en `app/globals.css`
 * porque solo existen para esta pantalla, y globals.css es donde vive toda
 * la paleta de la app.
 *
 * Nada de librerías: `@media print` es el motor que el navegador ya trae, y
 * su diálogo guarda en PDF en escritorio, Android e iOS.
 */
export function ReportPrintStyles() {
  return (
    <style>{`
      @media print {
        /* Papel. A4 es el tamaño que se usa en Costa Rica; los márgenes los
           pone la hoja y no el documento, para que el navegador pueda
           colocar bien sus encabezados. */
        @page { size: A4; margin: 14mm; }

        /* El papel es blanco siempre, también cuando la app está en oscuro:
           imprimir un fondo negro gasta tinta y deja el texto ilegible en
           las impresoras que no imprimen fondos. */
        html, body { background: #fff !important; }
        .reporte, .reporte * {
          background: transparent !important;
          color: #111 !important;
          border-color: #c8c8cc !important;
          box-shadow: none !important;
        }
        .reporte .reporte-apagado { color: #555 !important; }

        .reporte { max-width: none !important; padding: 0 !important; font-size: 10pt; }
        .reporte-no-imprimir { display: none !important; }

        /* Una sección corta no se parte: se va entera a la hoja siguiente.
           Una fila de tabla no se corta nunca por la mitad, y un título no
           se queda solo al final de una hoja. */
        .reporte-bloque { break-inside: avoid; }
        .reporte tr, .reporte li { break-inside: avoid; }
        .reporte h2, .reporte h3 { break-after: avoid; }

        /* Las tablas largas SÍ se parten, a propósito. Un bloque con
           break-inside: avoid más alto que la hoja no se puede respetar: el
           navegador lo empuja a la hoja siguiente, deja la primera casi en
           blanco y lo parte igual. Con cuarenta movimientos el reporte
           abría con una página vacía. Acá lo que mantiene la tabla legible
           no es evitar el corte sino repetir el encabezado (thead, abajo) y
           no partir ninguna fila.

           OJO: este CSS vive en un template literal de JSX, así que un
           backtick en un comentario lo corta y el archivo deja de compilar. */
        .reporte-tabla { break-inside: auto; }

        /* El encabezado de una tabla larga se repite en cada hoja; si no,
           la segunda página son columnas de números sin título. */
        .reporte thead { display: table-header-group; }
        .reporte tfoot { display: table-footer-group; }

        /* Los enlaces impresos no son enlaces: sin subrayado no se nota que
           sobraban. */
        .reporte a { text-decoration: none !important; }
      }
    `}</style>
  );
}
