import React, { useState } from 'react';
import { Service, PaintingCalculation, ACInstallationDetails } from '../types';
import { PaintingCalculator } from './PaintingCalculator';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  BadgeCheck, 
  ArrowRight, 
  HelpCircle, 
  AlertTriangle,
  XCircle,
  Wind,
  Calculator,
  Tv,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ServicePriceStepProps {
  service: Service;
  initialPaintingCalculation?: PaintingCalculation | null;
  initialACDetails?: ACInstallationDetails | null;
  onContinue: (options?: {
    paintingCalculation?: PaintingCalculation;
    acDetails?: ACInstallationDetails;
    adjustedPrice?: number;
  }) => void;
  onBack: () => void;
}

export const ServicePriceStep: React.FC<ServicePriceStepProps> = ({
  service,
  initialPaintingCalculation,
  initialACDetails,
  onContinue,
  onBack,
}) => {
  const isPaintingPerUnit = (service.category === 'Pintura' || service.category === 'Pintura residencial') && service.pricing_type === 'per_unit';
  const isACInstallation = ((service.category as string) === 'Aire acondicionado' || (service.categoria as string) === 'Aire acondicionado') && (service.id === 'AC-005' || service.service_name.toLowerCase().includes('split'));
  const isWallMount = service.id === 'HOG-006' || service.service_name.toLowerCase().includes('wall mount') || service.service_name.toLowerCase().includes('soporte de tv');

  // State for Wall Mount TV Installation choices
  const [selectedWallMountId, setSelectedWallMountId] = useState<string>('solo-55');

  const wallMountOptions = [
    {
      id: 'solo-55',
      group: 'Solo Instalación (cliente ya tiene soporte)',
      label: 'Hasta 55"',
      badge: 'Más común',
      price: 35,
      detail: 'Instalación y anclaje seguro en pared para televisores de hasta 55" con soporte provisto por el cliente.',
    },
    {
      id: 'solo-65',
      group: 'Solo Instalación (cliente ya tiene soporte)',
      label: '65" en adelante',
      badge: 'Gran formato',
      price: 50,
      detail: 'Montaje de gran tamaño, anclaje reforzado de alta seguridad para pantallas de 65 pulgadas o más.',
    },
    {
      id: 'combo-fijo',
      group: 'Combo Instalación + Soporte incluido',
      label: 'Soporte Fijo / Inclinable + Instalación',
      badge: 'Soporte FIXIT incluido',
      price: 50,
      detail: 'Incluye suministro de soporte metálico resistente (fijo o con inclinación) más instalación y anclaje completo.',
    },
    {
      id: 'combo-articulado-65',
      group: 'Combo Instalación + Soporte incluido',
      label: 'Soporte Brazo Articulado + Instalación (hasta 55")',
      badge: 'Brazo articulado',
      price: 65,
      detail: 'Incluye soporte de brazo giratorio / extensible (full motion hasta 55") más instalación profesional.',
    },
    {
      id: 'combo-articulado-75',
      group: 'Combo Instalación + Soporte incluido',
      label: 'Soporte Brazo Articulado + Instalación (65"+)',
      badge: 'Heavy Duty 65"+',
      price: 75,
      detail: 'Incluye soporte articulado de doble brazo para pantallas pesadas de 65"+ más instalación profesional.',
    },
  ];

  const currentWallMount = wallMountOptions.find((opt) => opt.id === selectedWallMountId) || wallMountOptions[0];

  // State for AC Installation choices
  const [acInstallType, setAcInstallType] = useState<'standard' | 'evaluation'>(() => {
    return initialACDetails?.requiresEvaluation ? 'evaluation' : 'standard';
  });
  const [acHasOldUnit, setAcHasOldUnit] = useState(initialACDetails?.needsDisassemblyOldUnit || false);
  const [acHasHeightOver3m, setAcHasHeightOver3m] = useState(initialACDetails?.hasHeightOver3m || false);
  const [acNeedsElectrical, setAcNeedsElectrical] = useState(initialACDetails?.needsElectricalPoint || false);
  const [acNeedsBrackets, setAcNeedsBrackets] = useState(initialACDetails?.needsWallBrackets || false);
  const [showACRulesDetail, setShowACRulesDetail] = useState(false);

  // If user wants to calculate painting directly
  const [isShowingPaintingCalculator, setIsShowingPaintingCalculator] = useState<boolean>(isPaintingPerUnit);
  const [currentPaintingCalc, setCurrentPaintingCalc] = useState<PaintingCalculation | null>(
    initialPaintingCalculation || null
  );

  // Handle continue for AC Installation
  const handleContinueAC = () => {
    const requiresEvaluation = acInstallType === 'evaluation' || acNeedsElectrical || acHasHeightOver3m;
    const acDetails: ACInstallationDetails = {
      isStandard: acInstallType === 'standard' && !acNeedsElectrical && !acHasHeightOver3m,
      pipeLengthMeters: 3,
      requiresEvaluation,
      hasHeightOver3m: acHasHeightOver3m,
      needsElectricalPoint: acNeedsElectrical,
      needsDisassemblyOldUnit: acHasOldUnit,
      needsWallBrackets: acNeedsBrackets,
      estimatedTotal: requiresEvaluation ? 25 : 90,
      notes: requiresEvaluation 
        ? 'Requiere evaluación técnica por condiciones especiales (cableado, altura o desmonte).' 
        : 'Instalación estándar residencial de 90 USD confirmada.',
    };

    onContinue({
      acDetails,
      adjustedPrice: requiresEvaluation ? 25 : 90,
    });
  };

  // If Painting calculator is active for per_unit painting
  if (isPaintingPerUnit && isShowingPaintingCalculator) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95 cursor-pointer"
            id="btn-back-to-services"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Volver a lista de servicios</span>
          </button>
          <span className="text-[11px] font-semibold text-[#B98A43] bg-[#B98A43]/10 border border-[#B98A43]/20 px-2.5 py-1 rounded-full">
            Pintura Residencial
          </span>
        </div>

        {/* Painting Calculator Component */}
        <PaintingCalculator
          initialService={service}
          initialCalculation={currentPaintingCalc}
          onConfirmCalculation={(calc, updatedService) => {
            setCurrentPaintingCalc(calc);
            onContinue({
              paintingCalculation: calc,
              adjustedPrice: calc.total,
            });
          }}
          onCancel={() => setIsShowingPaintingCalculator(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95 cursor-pointer"
          id="btn-back-to-services"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Volver a lista de servicios</span>
        </button>
        <span className="text-[11px] font-semibold text-[#756A5D] bg-[#FFFEFA] border border-[#DED4C5] px-2.5 py-1 rounded-full">
          {service.category}
        </span>
      </div>

      {/* Main Service Card */}
      <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-xs space-y-6">
        <div>
          <span className="text-[11px] font-bold text-[#0B72D9] uppercase tracking-wider block mb-1">
            Servicio seleccionado
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2421] leading-tight">
            {service.service_name}
          </h2>
          <p className="text-xs sm:text-sm text-[#756A5D] mt-2 leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* ========================================================== */}
        {/* CASE 1: AIRE ACONDICIONADO - INSTALACIÓN BÁSICA $90.00     */}
        {/* ========================================================== */}
        {isACInstallation ? (
          <div className="space-y-4">
            {/* Base Price Banner */}
            <div className="bg-[#F6F4EF] border border-[#0B72D9]/30 rounded-2xl p-5 text-center space-y-1 relative overflow-hidden">
              <span className="text-xs font-bold text-[#0B72D9] uppercase tracking-wider">
                Tarifa de Instalación FIXIT
              </span>
              <div className="flex items-baseline justify-center gap-1.5 py-1">
                <span className="text-xs font-semibold text-[#756A5D] uppercase">Desde</span>
                <span className="font-serif font-bold text-4xl sm:text-5xl text-[#1F2421]">
                  $90.00
                </span>
                <span className="text-sm font-semibold text-[#756A5D]">USD</span>
              </div>
              <p className="text-[11px] text-[#756A5D] max-w-sm mx-auto">
                Precio inicial para instalación residencial sencilla en punto preparado.
              </p>
            </div>

            {/* MANDATORY NOTICE AS REQUESTED:
                El precio de $90 debe aparecer como precio inicial y no debe interpretarse
                como un precio que incluye cualquier tipo de instalación. */}
            <div className="bg-[#B98A43]/10 border border-[#B98A43]/30 rounded-2xl p-4 text-xs space-y-2 text-[#8C601E]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B98A43] mt-0.5" />
                <p className="leading-relaxed font-medium">
                  <strong>Aclaración importante:</strong> El precio de <strong>$90.00</strong> es un precio base para instalación residencial sencilla en punto ya preparado. No debe interpretarse como una tarifa que incluye cualquier tipo o complejidad de instalación.
                </p>
              </div>
            </div>

            {/* Inclusions / Exclusions Accordion */}
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowACRulesDetail(!showACRulesDetail)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#1F2421] cursor-pointer"
              >
                <span>Ver qué incluye y qué no incluye la tarifa de $90</span>
                {showACRulesDetail ? (
                  <ChevronUp className="w-4 h-4 text-[#756A5D]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#756A5D]" />
                )}
              </button>

              <div className={`space-y-3 pt-2 text-xs ${showACRulesDetail ? 'block' : 'hidden'}`}>
                {/* Inclusiones */}
                <div>
                  <span className="font-bold text-[#53653D] flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Incluido en la tarifa básica ($90):</span>
                  </span>
                  <ul className="space-y-1 text-[#756A5D] pl-5 list-disc text-[11px]">
                    <li>Instalación de split de hasta 24,000 BTU en punto accesible</li>
                    <li>Hasta 3 metros de tubería de cobre y aislamiento térmico</li>
                    <li>Interconexión eléctrica entre unidad interior y condensador</li>
                    <li>Perforación pasamuro estándar en pared liviana o bloque</li>
                    <li>Vacío técnico con bomba profesional y prueba de presiones</li>
                    <li>Prueba de drenaje por gravedad y encendido inicial</li>
                  </ul>
                </div>

                {/* Exclusiones */}
                <div className="pt-2 border-t border-[#DED4C5]/60">
                  <span className="font-bold text-[#B98A43] flex items-center gap-1.5 mb-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>No incluido (Requiere evaluación o cargo adicional):</span>
                  </span>
                  <ul className="space-y-1 text-[#756A5D] pl-5 list-disc text-[11px]">
                    <li>Punto eléctrico nuevo, térmico/breaker o cableado desde el centro de carga</li>
                    <li>Tubería de cobre adicional a los 3 metros incluidos ($20/metro)</li>
                    <li>Instalaciones en altura superior a 3 metros (andamio o arnés)</li>
                    <li>Desmontaje de equipo split previo</li>
                    <li>Soportes metálicos de pared tipo escuadra</li>
                    <li>Perforaciones en losas macizas o concreto armado</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Condition Check for the User */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-[#1F2421] uppercase tracking-wider">
                ¿Cuáles son las condiciones de tu instalación?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAcInstallType('standard')}
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    acInstallType === 'standard'
                      ? 'bg-[#0B72D9]/5 border-[#0B72D9] ring-1 ring-[#0B72D9]'
                      : 'bg-[#F6F4EF]/50 border-[#DED4C5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#1F2421]">Instalación Estándar</span>
                    <span className="font-serif font-bold text-sm text-[#0B72D9]">$90.00</span>
                  </div>
                  <p className="text-[11px] text-[#756A5D]">
                    Punto preparado, hasta 3m de tubería, altura normal (&lt;3m).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAcInstallType('evaluation')}
                  className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    acInstallType === 'evaluation'
                      ? 'bg-[#B98A43]/10 border-[#B98A43] ring-1 ring-[#B98A43]'
                      : 'bg-[#F6F4EF]/50 border-[#DED4C5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#8C601E]">Requiere Evaluación</span>
                    <span className="font-serif font-bold text-sm text-[#8C601E]">$25.00</span>
                  </div>
                  <p className="text-[11px] text-[#756A5D]">
                    Tengo condiciones especiales o no estoy seguro. Diagnóstico acreditable.
                  </p>
                </button>
              </div>

              {/* Checkboxes for special needs */}
              <div className="space-y-2 pt-2 text-xs">
                <span className="text-[11px] text-[#756A5D] font-medium block">
                  Marca si tu caso requiere alguno de estos detalles:
                </span>
                
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F6F4EF]/40 border border-[#DED4C5]/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acNeedsElectrical}
                    onChange={(e) => setAcNeedsElectrical(e.target.checked)}
                    className="w-4 h-4 text-[#0B72D9] rounded border-[#DED4C5]"
                  />
                  <span className="text-[#1F2421]">Requiere punto eléctrico nuevo o breaker</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F6F4EF]/40 border border-[#DED4C5]/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acHasHeightOver3m}
                    onChange={(e) => setAcHasHeightOver3m(e.target.checked)}
                    className="w-4 h-4 text-[#0B72D9] rounded border-[#DED4C5]"
                  />
                  <span className="text-[#1F2421]">Instalación en altura superior a 3 metros</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F6F4EF]/40 border border-[#DED4C5]/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acHasOldUnit}
                    onChange={(e) => setAcHasOldUnit(e.target.checked)}
                    className="w-4 h-4 text-[#0B72D9] rounded border-[#DED4C5]"
                  />
                  <span className="text-[#1F2421]">Desmontaje o retiro de aire acondicionado viejo</span>
                </label>
              </div>
            </div>

            {/* Continue Button for AC */}
            <button
              onClick={handleContinueAC}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              id="btn-continue-ac-install"
            >
              <span>
                Continuar con {acInstallType === 'evaluation' || acNeedsElectrical || acHasHeightOver3m ? 'Evaluación Técnica ($25)' : 'Instalación Básica ($90)'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : service.diagnostic_required ? (
          /* ========================================================== */
          /* CASE 2: REQUIERE EVALUACIÓN / DIAGNÓSTICO                  */
          /* ========================================================== */
          <div className="bg-[#B98A43]/10 border border-[#B98A43]/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#8C601E]">
              <HelpCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm sm:text-base">
                Este servicio requiere una evaluación.
              </h3>
            </div>

            <div className="bg-[#FFFEFA] rounded-xl p-4 border border-[#B98A43]/20 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-[#756A5D] block">Tarifa de visita y revisión técnica</span>
                <span className="font-bold text-sm text-[#1F2421]">Diagnóstico FIXIT:</span>
              </div>
              <div className="text-right">
                <span className="font-serif font-bold text-2xl text-[#8C601E]">
                  ${service.diagnostic_price}
                </span>
                <span className="text-xs text-[#756A5D] ml-1">USD</span>
              </div>
            </div>

            <p className="text-xs text-[#8C601E] font-medium leading-relaxed">
              💡 <strong>Garantía de beneficio:</strong> Si realizas el trabajo con nosotros, el valor del diagnóstico se descuenta del servicio final.
            </p>

            <button
              onClick={() => onContinue({ adjustedPrice: service.diagnostic_price })}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer mt-2"
            >
              <span>Continuar con Diagnóstico ($25)</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : isPaintingPerUnit ? (
          /* ========================================================== */
          /* CASE 3: PINTURA POR M² CON CALCULADORA DISPONIBLE         */
          /* ========================================================== */
          <div className="space-y-4">
            <div className="bg-[#F6F4EF] border border-[#DED4C5] rounded-2xl p-5 text-center space-y-1">
              <span className="text-xs font-semibold text-[#756A5D] uppercase tracking-wider">
                Tarifa de pintura por m²
              </span>
              <div className="flex items-baseline justify-center gap-1.5 py-1">
                <span className="font-serif font-bold text-4xl sm:text-5xl text-[#1F2421]">
                  ${service.price.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-[#756A5D]">USD / m²</span>
              </div>
              <p className="text-[11px] text-[#B98A43] font-semibold flex items-center justify-center gap-1 pt-1">
                <span>Mínimo de servicio de pintura: ${service.minimum_service_charge || 75}.00</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsShowingPaintingCalculator(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0B72D9]/10 hover:bg-[#0B72D9]/15 border border-[#0B72D9]/30 text-[#0B72D9] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Abrir Calculadora de Pintura por m²</span>
            </button>

            <button
              onClick={() => onContinue({ adjustedPrice: service.minimum_service_charge || 75 })}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              <span>Continuar con tarifa estándar</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : isWallMount ? (
          /* ========================================================== */
          /* CASE 3.5: INSTALACIÓN WALL MOUNT / SOPORTE DE TV           */
          /* ========================================================== */
          <div className="space-y-5">
            {/* Price Preview Banner */}
            <div className="bg-[#F6F4EF] border border-[#DED4C5] rounded-2xl p-5 text-center space-y-1">
              <span className="text-xs font-semibold text-[#756A5D] uppercase tracking-wider">
                Tarifa seleccionada • {currentWallMount.label}
              </span>
              <div className="flex items-baseline justify-center gap-1.5 py-1">
                <span className="font-serif font-bold text-4xl sm:text-5xl text-[#1F2421]">
                  ${currentWallMount.price.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-[#756A5D]">USD</span>
              </div>
              <p className="text-[11px] text-[#53653D] font-semibold flex items-center justify-center gap-1 pt-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                Precio cerrado y garantizado • Nivelación profesional incluida
              </p>
            </div>

            {/* Options Selection Blocks */}
            <div className="space-y-4">
              {/* Bloque 1: Solo Instalación */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Tv className="w-4 h-4 text-[#0B72D9]" />
                  <span className="text-xs font-bold text-[#1F2421] uppercase tracking-wider">
                    Opción A: Solo Instalación (cliente ya tiene soporte)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {wallMountOptions
                    .filter((o) => o.id.startsWith('solo-'))
                    .map((opt) => {
                      const isSelected = selectedWallMountId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedWallMountId(opt.id)}
                          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#0B72D9]/5 border-[#0B72D9] ring-2 ring-[#0B72D9]/20'
                              : 'bg-[#FFFEFA] border-[#DED4C5] hover:border-[#0B72D9]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="font-serif font-bold text-sm text-[#1F2421]">
                              {opt.label}
                            </span>
                            <span className="font-bold text-sm text-[#0B72D9]">
                              ${opt.price}.00
                            </span>
                          </div>
                          <p className="text-[11px] text-[#756A5D] leading-relaxed">
                            {opt.detail}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Bloque 2: Combo Instalación + Soporte incluido */}
              <div className="space-y-2 pt-2 border-t border-[#DED4C5]/40">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck className="w-4 h-4 text-[#53653D]" />
                  <span className="text-xs font-bold text-[#1F2421] uppercase tracking-wider">
                    Opción B: Combo Instalación + Soporte FIXIT incluido
                  </span>
                </div>
                <div className="space-y-2.5">
                  {wallMountOptions
                    .filter((o) => o.id.startsWith('combo-'))
                    .map((opt) => {
                      const isSelected = selectedWallMountId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedWallMountId(opt.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#0B72D9]/5 border-[#0B72D9] ring-2 ring-[#0B72D9]/20'
                              : 'bg-[#FFFEFA] border-[#DED4C5] hover:border-[#0B72D9]/50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-serif font-bold text-sm text-[#1F2421]">
                                {opt.label}
                              </span>
                              <span className="text-[10px] font-semibold bg-[#53653D]/10 text-[#53653D] px-2 py-0.5 rounded-full border border-[#53653D]/20">
                                {opt.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#756A5D] leading-relaxed">
                              {opt.detail}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-serif font-bold text-base sm:text-lg text-[#1F2421]">
                              ${opt.price}.00
                            </span>
                            <span className="block text-[10px] text-[#756A5D]">USD</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => onContinue({ adjustedPrice: currentWallMount.price })}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              id="btn-continue-wall-mount"
            >
              <span>Continuar con {currentWallMount.label} (${currentWallMount.price}.00)</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          /* ========================================================== */
          /* CASE 4: STANDARD FIXED PRICE SERVICE                       */
          /* ========================================================== */
          <div className="space-y-4">
            <div className="bg-[#F6F4EF] border border-[#DED4C5] rounded-2xl p-5 text-center space-y-1">
              <span className="text-xs font-semibold text-[#756A5D] uppercase tracking-wider">
                Precio estándar FIXIT
              </span>
              <div className="flex items-baseline justify-center gap-1.5 py-1">
                <span className="font-serif font-bold text-4xl sm:text-5xl text-[#1F2421]">
                  ${service.price}
                </span>
                <span className="text-sm font-semibold text-[#756A5D]">USD</span>
              </div>
              <p className="text-[11px] text-[#53653D] font-semibold flex items-center justify-center gap-1 pt-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                Tarifa estándar confirmada • Sin cobros sorpresivos
              </p>
            </div>

            <button
              onClick={() => onContinue({ adjustedPrice: service.price })}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              id="btn-continue-to-detail"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Benefits & Inclusions Checklist */}
        <div className="space-y-2.5 pt-2 border-t border-[#DED4C5]/60 text-xs text-[#756A5D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
            <span>Mano de obra con técnicos idóneos propios y uniformados</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0B72D9] shrink-0" />
            <span>Tiempo estimado de atención: <strong>{service.estimated_duration}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B72D9] shrink-0" />
            <span>Garantía por escrito de <strong>{service.warranty_days} días</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
