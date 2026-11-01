import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Política de privacidad"
      updatedAt="31 de octubre de 2026"
      intro={
        <p>
          Esta política se rige por la Ley N.º 8968, Ley de Protección de la Persona frente al
          tratamiento de sus datos personales, de Costa Rica. También aplican los{" "}
          <Link href="/terminos">términos de servicio</Link>.
        </p>
      }
      summary={{
        label: "Resumen, por si no leés todo esto",
        items: [
          "Entrás con Google y solo recibimos tu nombre, correo y foto de perfil.",
          "La app no accede a tu Gmail, a tu banco ni a ninguna otra cuenta tuya.",
          "Los datos financieros son los que vos anotás a mano; nada se importa solo.",
          "No vendemos ni alquilamos tus datos, a nadie, nunca.",
          "Podés borrar tu cuenta y todo tu historial cuando quieras.",
          "Tenés derechos ARCO y podés reclamar ante PRODHAB si algo no cuadra.",
        ],
      }}
    >
      <LegalSection number={1} title="Responsable de la base de datos">
        <p>
          TicoFinanza es un proyecto operado por una persona física (no una empresa constituida),
          identificada como <span>Camil</span>, responsable del tratamiento de los datos
          personales recolectados a través de esta aplicación.
        </p>
        <p>
          Contacto directo para cualquier consulta, solicitud o reclamo relacionado con tus datos
          personales: <a href="mailto:info@ticofinanza.com">info@ticofinanza.com</a>. No se
          mantiene un domicilio físico de atención al público; toda gestión se realiza por correo
          electrónico.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Qué datos personales recolectamos">
        <p>Estos son todos los datos que maneja la aplicación:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <span>Datos de identidad de Google</span>: tu nombre, dirección de correo y foto de
            perfil, más un identificador único de tu cuenta de Google. Es lo único que recibimos
            al iniciar sesión, y es el único método de acceso de la app.
          </li>
          <li>
            <span>Datos financieros que vos ingresás</span>: los ingresos y gastos que registrás
            (monto, fecha, descripción y categoría) y tus gastos fijos o membresías (nombre,
            monto, categoría, día de cobro del mes y si está pagado o pendiente), junto con las
            categorías que creés.
          </li>
          <li>
            <span>Datos de perfil opcionales</span>: fecha de nacimiento y foto de perfil propia,
            si decidís cargarlas en Ajustes. Podés no hacerlo y la app funciona igual.
          </li>
          <li>
            <span>Preferencias</span>: el tema (claro, oscuro o el del sistema).
          </li>
          <li>
            <span>Datos técnicos de sesión</span>: cookies necesarias para mantener tu sesión
            iniciada y proteger el inicio de sesión (ver la sección de cookies más abajo).
          </li>
        </ul>
        <p>
          La aplicación <span>no</span> accede a tu correo electrónico, no se conecta a ninguna
          entidad bancaria y no te pide usuario ni contraseña de tu banca en línea. Ningún
          movimiento se importa automáticamente: todos los registra la persona usuaria.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Para qué usamos cada dato">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <span>Nombre, correo y foto de Google</span>: identificarte, mostrarte tu propia
            información y enviarte el correo de bienvenida y el código de confirmación cuando
            pedís eliminar tu cuenta.
          </li>
          <li>
            <span>Datos financieros</span>: calcular tus totales del mes, ordenar tus próximos
            pagos, armar el calendario de cobros y los gráficos de gasto por categoría e ingresos
            contra egresos.
          </li>
          <li>
            <span>Fecha de nacimiento y foto de perfil</span>: personalizar tu cuenta; son
            enteramente opcionales y no se usan para ningún otro fin.
          </li>
          <li>
            <span>Cookies de sesión</span>: mantenerte con la sesión iniciada y proteger el
            proceso de login contra falsificación de solicitudes (CSRF).
          </li>
        </ul>
        <p>
          No usamos ninguno de estos datos para publicidad, no los combinamos con datos de
          terceros para crear perfiles de consumo y no los enviamos a ningún modelo de
          inteligencia artificial.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Consentimiento y permisos de Google">
        <p>
          El único acceso que la app solicita a tu cuenta de Google son los permisos básicos de
          perfil (<span>openid</span>, <span>email</span> y <span>profile</span>): nombre, correo
          y foto. No se solicita ningún permiso sobre Gmail, Drive, Calendar ni ninguna otra API
          de Google, por lo que la app no puede leer ni modificar nada de tu cuenta.
        </p>
        <p>
          Podés revisar y revocar el acceso de TicoFinanza en cualquier momento desde{" "}
          <span>myaccount.google.com/permissions</span>, sin pasar por la app.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Cómo protegemos tus datos">
        <p>
          Cada consulta a la base de datos se hace con la sesión de la persona usuaria y está
          limitada por políticas de seguridad a nivel de fila (RLS): una cuenta solo puede leer y
          escribir sus propios movimientos, gastos fijos y categorías. La autenticación la
          gestiona Supabase Auth, y la app no almacena contraseñas ni tokens de acceso a servicios
          de terceros. La información viaja cifrada en tránsito (HTTPS) y se guarda cifrada en
          reposo por el proveedor de base de datos.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Con quién compartimos tus datos">
        <p>No vendemos ni alquilamos tus datos a nadie, bajo ninguna circunstancia.</p>
        <p>
          Los únicos terceros que procesan información en tu nombre, como encargados del
          tratamiento, son:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <span>Google</span>, para identificarte al iniciar sesión (Google LLC, Estados
            Unidos).
          </li>
          <li>
            <span>Supabase</span>, donde vive la base de datos y el sistema de autenticación
            (Supabase Inc., con infraestructura alojada en Estados Unidos).
          </li>
          <li>
            <span>Vercel</span>, donde corre la aplicación, es decir el hosting (Vercel Inc.,
            Estados Unidos).
          </li>
          <li>
            <span>Resend</span>, para el correo de bienvenida y el código de eliminación de cuenta
            (Resend Inc., Estados Unidos).
          </li>
        </ul>
        <p>
          Esto implica una transferencia internacional de datos fuera de Costa Rica, hacia
          proveedores ubicados principalmente en Estados Unidos. Estos proveedores operan bajo sus
          propios compromisos contractuales de protección de datos y cifran la información en
          tránsito y en reposo. No compartimos datos con ninguna otra entidad, ni pública ni
          privada, salvo obligación legal.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Cuánto tiempo guardamos tus datos">
        <p>
          Guardamos tus datos mientras tu cuenta esté activa. Si borrás tu cuenta (o nos escribís
          pidiéndolo), eliminamos tus movimientos, gastos fijos, categorías, preferencias y datos
          de perfil de forma permanente, dentro de los siguientes 30 días.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Cookies y tecnologías similares">
        <p>
          Usamos únicamente cookies estrictamente necesarias para el funcionamiento del sitio: una
          cookie de sesión, para mantenerte con la sesión iniciada, y dos cookies temporales de
          seguridad durante el inicio de sesión con Google, que vencen a los diez minutos y
          protegen ese intercambio contra falsificación de solicitudes.
        </p>
        <p>
          No usamos cookies de publicidad, de rastreo entre sitios, ni herramientas de analítica
          de terceros. No vas a ver un banner de cookies porque no usamos ninguna que requiera tu
          consentimiento adicional.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Tus derechos ARCO">
        <p>
          Como titular de tus datos, la Ley 8968 te reconoce el derecho a Acceder, Rectificar,
          Cancelar y Oponerte al tratamiento de tu información (derechos ARCO):
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <span>Acceso</span>: pedir una copia de qué datos tuyos tenemos guardados.
          </li>
          <li>
            <span>Rectificación</span>: corregir datos tuyos que estén incorrectos o
            desactualizados.
          </li>
          <li>
            <span>Cancelación</span>: pedir que borremos tus datos.
          </li>
          <li>
            <span>Oposición</span>: oponerte a que usemos tus datos para un fin específico.
          </li>
        </ul>
        <p>
          Desde Ajustes podés ejercer varios de estos derechos vos mismo, sin pedirle nada a
          nadie: editar o borrar tu información de perfil, borrar movimientos individuales o todo
          tu historial, y eliminar tu cuenta por completo con un código de confirmación que
          llega a tu correo.
        </p>
        <p>
          Para cualquier otra solicitud, escribinos a{" "}
          <a href="mailto:info@ticofinanza.com">info@ticofinanza.com</a>. Respondemos dentro de un
          plazo máximo de 5 días hábiles, y ejercer estos derechos nunca tiene costo alguno para
          vos.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Autoridad de control: PRODHAB">
        <p>
          Si considerás que no atendimos correctamente tu solicitud, o que tus datos personales
          fueron tratados de forma indebida, podés presentar un reclamo ante la Agencia de
          Protección de Datos de los Habitantes (PRODHAB), la autoridad de control en Costa Rica
          en materia de protección de datos personales, independientemente de cualquier gestión
          que hagas con nosotros directamente.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Actualizaciones a esta política">
        <p>
          Si cambiamos algo importante de cómo manejamos tus datos, lo vamos a reflejar acá y
          actualizamos la fecha de arriba. Si el cambio es significativo, te avisamos por correo.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Menores de edad">
        <p>
          TicoFinanza no está dirigido a menores de 13 años, y no recolectamos a sabiendas
          información de niños. Si sos padre/madre y creés que tu hijo/a nos dio información,
          escribinos y la borramos.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Contacto">
        <p>
          Si tenés dudas sobre esta política, sobre cómo usamos tus datos, o querés ejercer tus
          derechos ARCO, escribinos a{" "}
          <a href="mailto:info@ticofinanza.com">info@ticofinanza.com</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
