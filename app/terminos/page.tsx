import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = { title: "Términos de servicio" };

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Términos de servicio"
      updatedAt="31 de octubre de 2026"
      intro={
        <p>
          Al crear una cuenta o usar TicoFinanza, aceptás estos términos. Si no estás de acuerdo,
          no uses la aplicación.
        </p>
      }
    >
      <LegalSection number={1} title="Qué es TicoFinanza">
        <p>
          TicoFinanza es una aplicación de finanzas personales para Costa Rica, de registro
          manual: vos anotás tus ingresos y gastos, y tus membresías y gastos fijos con su día de
          cobro del mes, y la app los organiza por categoría y te muestra el resumen del mes, los
          próximos pagos, el calendario de cobros y los gráficos de gasto. Todo se registra y se
          suma en colones.
        </p>
        <p>
          La aplicación no se conecta a ninguna entidad bancaria y no lee tu correo electrónico:
          ningún movimiento se importa automáticamente.
        </p>
        <p>
          Es un proyecto operado por una persona física (no una empresa constituida). Los detalles
          de quién trata tus datos y cómo están en la{" "}
          <Link href="/privacidad">política de privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Requisitos para usar la app">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Debés tener al menos 13 años para crear una cuenta.</li>
          <li>
            El único método de acceso es iniciar sesión con una cuenta de Google, de la que la app
            recibe nombre, correo y foto de perfil.
          </li>
          <li>
            Sos responsable de que la información de tu cuenta sea tuya y esté vigente; no está
            permitido usar TicoFinanza con cuentas de terceros sin su autorización.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Tu responsabilidad como usuario">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Sos responsable de proteger la cuenta de Google con la que iniciás sesión.</li>
          <li>
            Los montos, fechas, categorías y descripciones que ingresás son tu responsabilidad:
            la app no verifica ni corrige los datos que cargás, porque no tiene con qué
            compararlos.
          </li>
          <li>
            La app no da consejo financiero ni contable; si vas a usar la información para algo
            formal (por ejemplo, una declaración de impuestos), revisala contra tus estados de
            cuenta.
          </li>
          <li>
            No está permitido usar la aplicación para actividades ilegales, ni intentar vulnerar
            su seguridad, ni acceder a datos de otros usuarios.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={4} title="Límites de la app">
        <p>
          Todo lo que la app muestra se calcula sobre lo que vos anotaste: si un gasto no se
          registró, no aparece en ningún total, en ningún gráfico y en ningún aviso de
          vencimiento. Los gastos fijos son un plan mensual, no un cobro real: marcar algo como
          pagado no mueve plata ni confirma que el cobro se hizo.
        </p>
        <p>
          Los avisos de vencimiento se calculan con el día de cobro que vos indicás. Si el banco o
          el comercio cambia la fecha, hay que actualizarla a mano.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Limitación de responsabilidad">
        <p>
          TicoFinanza se ofrece &ldquo;tal cual&rdquo;, sin garantías de ningún tipo. No somos un
          banco, ni una entidad financiera regulada, ni asesores financieros: la app es una
          herramienta de organización personal, y las decisiones financieras que tomés en base a
          la información que te mostramos son enteramente tuyas.
        </p>
        <p>
          En la máxima medida permitida por la ley, no somos responsables por pérdidas económicas,
          decisiones financieras, pagos vencidos, o daños indirectos derivados del uso (o la
          imposibilidad de uso) de la aplicación, incluyendo interrupciones del servicio.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Disponibilidad del servicio">
        <p>
          TicoFinanza es un servicio gratuito y puede cambiar, pausarse o discontinuarse en
          cualquier momento, con o sin aviso previo. Si eso llegara a pasar, te avisamos al correo
          de tu cuenta con tiempo para que puedas copiar tu información.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Cierre de cuenta">
        <p>
          Podés borrar tu cuenta cuando quieras desde Ajustes, o escribiéndonos. También podemos
          suspender o cerrar una cuenta si detectamos un uso que viole estos términos o que ponga
          en riesgo la seguridad de otros usuarios.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Cambios a estos términos">
        <p>
          Si actualizamos estos términos de forma significativa, lo vamos a reflejar acá con la
          fecha de actualización, y te avisamos al correo de tu cuenta.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Contacto">
        <p>
          Dudas sobre estos términos: escribinos a{" "}
          <a href="mailto:info@ticofinanza.com">info@ticofinanza.com</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
