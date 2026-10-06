import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, Mail, MessageCircle, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy({ onBack, onGoHome }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onGoHome) {
      onGoHome();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#071326] text-white py-8 px-4 sm:px-6 relative overflow-hidden selection:bg-[#0B72D9]/30">
      {/* Glow ambient background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-[#0B72D9]/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#082D60]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6">
        {/* Navigation Bar / Return button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-semibold text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
            <span>Volver</span>
          </button>

          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B72D9]" />
            <span>Ley 81 de 2019 • Panamá</span>
          </div>
        </div>

        {/* Main Glassmorphic Container */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-white/10 pb-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#0B72D9]/20 border border-[#0B72D9]/40 flex items-center justify-center text-[#0B72D9] mb-4 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              POLÍTICA DE PRIVACIDAD DE FIXIT
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Última actualización: 6 de octubre de 2026
            </p>
          </div>

          {/* Intro */}
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
            En Fixit (accesible a través de fixitpanama.com), la privacidad de nuestros visitantes y clientes es de extrema importancia para nosotros. Esta Política de Privacidad documenta los tipos de información personal que recopilamos, cómo la utilizamos y cómo la protegemos, en cumplimiento con la Ley 81 de 2019 sobre Protección de Datos Personales de la República de Panamá.
          </div>

          {/* Section 1: Información que recopilamos */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Información que recopilamos
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Al registrarte y utilizar nuestros servicios, recopilamos la siguiente información:
            </p>
            <ul className="space-y-2.5 pt-1 pl-1">
              <li className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
                <span>
                  Información de contacto y perfil (Nombre, correo electrónico) al registrarte manualmente o mediante el inicio de sesión con Google.
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
                <span>
                  Datos de los pedidos y cotizaciones que realizas en nuestra plataforma.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: Uso de la información */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Uso de la información
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Utilizamos la información recopilada exclusivamente para:
            </p>
            <ul className="space-y-2.5 pt-1 pl-1">
              <li className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
                <span>Procesar, gestionar y entregar tus pedidos o servicios.</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
                <span>Autenticar tu identidad y mantener la seguridad de tu cuenta.</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
                <span>Contactarte en relación con el estado de tus solicitudes o brindar soporte técnico.</span>
              </li>
            </ul>
            <div className="bg-[#0B72D9]/10 border border-[#0B72D9]/30 rounded-xl p-3.5 mt-3 text-xs sm:text-sm text-slate-200 font-medium">
              No vendemos, alquilamos ni compartimos tu información personal con terceros para fines comerciales o de marketing sin tu consentimiento.
            </div>
          </section>

          {/* Section 3: Seguridad y Almacenamiento */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Seguridad y Almacenamiento
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Tu información se almacena de forma segura en nuestras bases de datos operativas. Implementamos medidas de seguridad técnicas para proteger tus datos contra accesos no autorizados, alteraciones o destrucción.
            </p>
          </section>

          {/* Section 4: Tus Derechos (Derechos ARCO) */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Tus Derechos (Derechos ARCO)
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              De acuerdo con la legislación panameña, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al uso de tus datos. Puedes solicitar la eliminación definitiva de tu cuenta y de toda tu información personal directamente desde las opciones de tu perfil en la aplicación, o enviando un correo a:{' '}
              <a
                href="mailto:contacto@fixitpanama.com"
                className="text-[#38bdf8] hover:underline font-semibold"
              >
                contacto@fixitpanama.com
              </a>.
            </p>
          </section>

          {/* Section 5: Contacto */}
          <section className="space-y-4 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Contacto
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Si tienes dudas sobre esta Política de Privacidad, puedes contactarnos a través de contacto@fixitpanama.com o nuestro WhatsApp oficial.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="mailto:contacto@fixitpanama.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-semibold text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <Mail className="w-4 h-4 text-[#0B72D9]" />
                <span>contacto@fixitpanama.com</span>
              </a>

              <a
                href="https://wa.me/50765356072?text=Hola%20FIXIT,%20tengo%20una%20consulta%20sobre%20la%20Pol%C3%ADtica%20de%20Privacidad."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-xs sm:text-sm font-semibold text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp Oficial FIXIT</span>
              </a>
            </div>
          </section>

          {/* Return button at bottom */}
          <div className="pt-6 border-t border-white/10 flex justify-center">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl bg-[#0B72D9] hover:bg-[#0988F5] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-[#0B72D9]/25 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Volver a la aplicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
