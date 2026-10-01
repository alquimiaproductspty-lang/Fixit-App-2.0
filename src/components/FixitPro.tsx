import React from 'react';
import { Check, Briefcase, Clock, ShieldCheck } from 'lucide-react';

export default function FixitPro() {
  const handleContact = (plan: string) => {
    const message = `Hola FIXIT. Me interesa el plan corporativo FIXIT Pro: ${plan}. Quisiera agendar una evaluación para mi negocio.`;
    window.open(`https://wa.me/50761372394?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="bg-[#F6F4EF] min-h-screen pb-16 pt-8 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#082D60] tracking-tight">
            FIXIT Pro: Tu departamento de mantenimiento tercerizado
          </h1>
          <p className="text-base sm:text-lg text-[#756A5D] max-w-2xl mx-auto leading-relaxed">
            Mantenimiento preventivo y correctivo por suscripción para locales comerciales en Panamá. 
            Cero pasivo laboral, cero emergencias costosas.
          </p>
        </div>

        {/* Beneficios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFFEFA] p-6 rounded-2xl border border-[#DED4C5] flex flex-col items-center text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 bg-[#082D60]/10 rounded-full flex items-center justify-center text-[#082D60]">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1F2421]">Respuesta Inmediata</h3>
            <p className="text-sm text-[#756A5D]">Coordinación directa vía WhatsApp para que tu operación no se detenga.</p>
          </div>
          <div className="bg-[#FFFEFA] p-6 rounded-2xl border border-[#DED4C5] flex flex-col items-center text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 bg-[#082D60]/10 rounded-full flex items-center justify-center text-[#082D60]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1F2421]">Costos Predecibles</h3>
            <p className="text-sm text-[#756A5D]">Paga una tarifa plana mensual y olvídate de cotizaciones sorpresa por mano de obra.</p>
          </div>
          <div className="bg-[#FFFEFA] p-6 rounded-2xl border border-[#DED4C5] flex flex-col items-center text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 bg-[#082D60]/10 rounded-full flex items-center justify-center text-[#082D60]">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1F2421]">Cero Pasivo Laboral</h3>
            <p className="text-sm text-[#756A5D]">Sin contratos, décimo, vacaciones ni seguros. Un equipo completo a tu disposición.</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Plan Básico */}
          <div className="bg-[#FFFEFA] p-6 sm:p-8 rounded-3xl border border-[#DED4C5] space-y-6 shadow-2xs">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#1F2421]">Básico Comercial</h3>
              <p className="text-sm text-[#756A5D]">Ideal para inspección constante y ajustes menores.</p>
            </div>
            <div className="text-[#082D60]">
              <span className="text-4xl font-extrabold">$149</span>
              <span className="text-sm font-medium">/mes</span>
            </div>
            <button 
              onClick={() => handleContact('Básico Comercial')}
              className="w-full py-3 px-4 bg-[#F6F4EF] text-[#082D60] border border-[#DED4C5] hover:bg-[#DED4C5]/30 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Solicitar Evaluación
            </button>
            <ul className="space-y-3 text-sm text-[#756A5D]">
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#53653D] shrink-0" /> <span><strong>4 visitas preventivas</strong> al mes (1/semana)</span></li>
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#53653D] shrink-0" /> <span>Mano de obra en plomería básica y electricidad menor</span></li>
            </ul>
          </div>

          {/* Plan Popular (Operación Activa) */}
          <div className="bg-[#082D60] p-6 sm:p-8 rounded-3xl border-2 border-[#0B72D9] space-y-6 shadow-xl relative scale-100 md:scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B72D9] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              El Más Popular
            </div>
            <div className="space-y-2 text-white">
              <h3 className="text-xl font-bold">Operación Activa</h3>
              <p className="text-sm text-white/80">Cobertura intensiva para restaurantes o locales de alto tráfico.</p>
            </div>
            <div className="text-white">
              <span className="text-4xl font-extrabold">$279</span>
              <span className="text-sm font-medium text-white/80">/mes</span>
            </div>
            <button 
              onClick={() => handleContact('Operación Activa')}
              className="w-full py-3 px-4 bg-[#0B72D9] hover:bg-[#0988F5] text-white rounded-xl font-bold text-sm transition-colors shadow-lg cursor-pointer"
            >
              Solicitar Evaluación
            </button>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#0B72D9] bg-white rounded-full p-1 shrink-0" /> <span><strong>8 visitas al mes</strong> (2/semana)</span></li>
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#0B72D9] bg-white rounded-full p-1 shrink-0" /> <span>Mantenimiento preventivo intensivo</span></li>
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#0B72D9] bg-white rounded-full p-1 shrink-0" /> <span>Soporte prioritario ante fallas</span></li>
            </ul>
          </div>

          {/* Plan VIP */}
          <div className="bg-[#FFFEFA] p-6 sm:p-8 rounded-3xl border border-[#DED4C5] space-y-6 shadow-2xs">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#1F2421]">Priority B2B</h3>
              <p className="text-sm text-[#756A5D]">Tu propio técnico in-house para que nunca te detengas.</p>
            </div>
            <div className="text-[#082D60]">
              <span className="text-4xl font-extrabold">$499</span>
              <span className="text-sm font-medium">/mes</span>
            </div>
            <button 
              onClick={() => handleContact('Priority B2B')}
              className="w-full py-3 px-4 bg-[#F6F4EF] text-[#082D60] border border-[#DED4C5] hover:bg-[#DED4C5]/30 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Solicitar Evaluación
            </button>
            <ul className="space-y-3 text-sm text-[#756A5D]">
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#53653D] shrink-0" /> <span><strong>16 visitas al mes</strong> (Aprox. día de por medio)</span></li>
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#53653D] shrink-0" /> <span>Atención VIP de emergencias</span></li>
              <li className="flex gap-2.5"><Check className="w-5 h-5 text-[#53653D] shrink-0" /> <span>Ejecución de proyectos menores incluidos</span></li>
            </ul>
          </div>
        </div>

        {/* Legal & Terms */}
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <h3 className="font-bold text-lg text-[#1F2421]">Términos y Condiciones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#756A5D]">
            <p><strong>Horario de Operaciones:</strong> Lunes a Viernes de 8:00 a.m. a 5:00 p.m. y Sábados de 8:00 a.m. a 12:00 m.d.</p>
            <p><strong>Materiales no incluidos:</strong> La suscripción cubre estrictamente la mano de obra y el diagnóstico. Repuestos y materiales se facturan por separado previa aprobación.</p>
            <p><strong>Agendamiento:</strong> Las visitas están sujetas a la logística de rutas por zona de FIXIT Panamá. El agendamiento no es inmediato salvo en atención VIP.</p>
            <p><strong>Trabajos extra:</strong> Remodelaciones mayores o proyectos fuera del alcance reciben un 15% de descuento exclusivo para suscriptores.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
