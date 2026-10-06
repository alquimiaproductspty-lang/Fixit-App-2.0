import React from 'react';
import { FileText, ArrowLeft, Mail, MessageCircle, Scale, CheckCircle2 } from 'lucide-react';

export default function TermsOfService({ onBack, onGoHome }) {
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
            <Scale className="w-3.5 h-3.5 text-[#0B72D9]" />
            <span>Términos Legales • FIXIT Panamá</span>
          </div>
        </div>

        {/* Main Glassmorphic Container */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-white/10 pb-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#0B72D9]/20 border border-[#0B72D9]/40 flex items-center justify-center text-[#0B72D9] mb-4 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              TÉRMINOS Y CONDICIONES DE SERVICIO DE FIXIT
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Última actualización: 6 de octubre de 2026
            </p>
          </div>

          {/* Intro */}
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
            Bienvenido a Fixit (fixitpanama.com). Al acceder y utilizar nuestra plataforma, aceptas estar sujeto a los siguientes términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios.
          </div>

          {/* Section 1: Descripción del Servicio */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Descripción del Servicio
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Fixit es una plataforma digital que facilita la solicitud, cotización y gestión de pedidos y servicios. Nos reservamos el derecho de modificar, actualizar o suspender el servicio en cualquier momento sin previo aviso.
            </p>
          </section>

          {/* Section 2: Cuentas de Usuario */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Cuentas de Usuario
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Para agilizar tus pedidos, puedes registrarte mediante tu correo electrónico o usando tu cuenta de Google. Eres responsable de mantener la confidencialidad de tu información de acceso y de todas las actividades que ocurran bajo tu cuenta. Puedes solicitar la eliminación de tu cuenta en cualquier momento.
            </p>
          </section>

          {/* Section 3: Uso Aceptable y Obligaciones */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Uso Aceptable y Obligaciones
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Te comprometes a proporcionar información veraz al momento de cotizar o realizar un pedido. Queda prohibido utilizar la plataforma para actividades fraudulentas, suplantación de identidad o intentar vulnerar la seguridad del sistema.
            </p>
          </section>

          {/* Section 4: Pagos y Servicios */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Pagos y Servicios
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Los precios, tiempos de entrega y condiciones específicas de cada servicio o producto serán confirmados directamente a través de nuestros canales de atención (ej. WhatsApp) tras la solicitud inicial en la plataforma, a menos que se indique lo contrario.
            </p>
          </section>

          {/* Section 5: Limitación de Responsabilidad */}
          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Limitación de Responsabilidad
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Fixit se esfuerza por mantener la plataforma operativa, pero no se hace responsable por daños directos, indirectos o incidentales derivados de fallos técnicos, caídas del servidor o la imposibilidad temporal de uso de la plataforma.
            </p>
          </section>

          {/* Section 6: Contacto */}
          <section className="space-y-4 border-t border-white/10 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B72D9]" />
              Contacto
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Para cualquier consulta relacionada con estos términos, puedes contactarnos a soporte@fixitpanama.com.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="mailto:soporte@fixitpanama.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-semibold text-white transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <Mail className="w-4 h-4 text-[#0B72D9]" />
                <span>soporte@fixitpanama.com</span>
              </a>

              <a
                href="https://wa.me/50765356072?text=Hola%20FIXIT,%20tengo%20una%20consulta%20sobre%20los%20T%C3%A9rminos%20de%20Servicio."
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
