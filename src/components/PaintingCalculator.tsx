import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Service, PaintingCalculation } from '../types';
import { FIXIT_CATALOG } from '../data/catalog';
import { 
  Calculator, 
  Paintbrush, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Info, 
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PaintingCalculatorProps {
  initialService: Service;
  initialCalculation?: PaintingCalculation | null;
  onConfirmCalculation: (calculation: PaintingCalculation, updatedService: Service) => void;
  onCancel?: () => void;
}

const PRESET_ROOMS: Array<{ key: 'accentWall' | 'standardRoom' | 'masterRoom' | 'livingDining' | 'fullApartment'; label: string; m2: number; desc: string }> = [
  { key: 'accentWall', label: 'Pared de acento', m2: 15, desc: 'Aprox. 1 pared' },
  { key: 'standardRoom', label: 'Recámara estándar', m2: 35, desc: 'Habitación típica' },
  { key: 'masterRoom', label: 'Recámara principal', m2: 50, desc: 'Recámara amplia' },
  { key: 'livingDining', label: 'Sala / Comedor', m2: 70, desc: 'Área social' },
  { key: 'fullApartment', label: 'Apartamento completo', m2: 120, desc: 'Paredes interiores' },
];

export const PaintingCalculator: React.FC<PaintingCalculatorProps> = ({
  initialService,
  initialCalculation,
  onConfirmCalculation,
  onCancel,
}) => {
  const { t } = useTranslation();

  // Available painting services
  const paintingServices = useMemo(() => {
    return FIXIT_CATALOG.filter(
      (s) => s.category.toLowerCase() === 'pintura' && s.pricing_type === 'per_unit'
    );
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialCalculation?.serviceId || initialService.id || 'PIN-001'
  );

  const activeService = useMemo(() => {
    return (
      paintingServices.find((s) => s.id === selectedServiceId) ||
      initialService ||
      paintingServices[0]
    );
  }, [paintingServices, selectedServiceId, initialService]);

  const [areaM2, setAreaM2] = useState<number>(() => {
    if (initialCalculation && initialCalculation.areaM2 > 0) {
      return initialCalculation.areaM2;
    }
    return 35; // Default standard room
  });

  const [customDimensionsOpen, setCustomDimensionsOpen] = useState(false);
  const [wallLength, setWallLength] = useState<string>('4');
  const [wallHeight, setWallHeight] = useState<string>('2.6');
  const [wallCount, setWallCount] = useState<number>(4);

  // Extras
  const [hasHeightSurcharge, setHasHeightSurcharge] = useState<boolean>(
    initialCalculation?.hasHeightSurcharge || false
  );
  const [hasPatchingRepair, setHasPatchingRepair] = useState<boolean>(
    initialCalculation?.hasPatchingRepair || false
  );
  const [includePaintMaterials, setIncludePaintMaterials] = useState<boolean>(
    initialCalculation?.includePaintMaterials || false
  );

  const unitRate = activeService.price || 5.5;
  const minimumServiceCharge = activeService.minimum_service_charge || 75;

  // Calculation logic
  const calculationResult: PaintingCalculation = useMemo(() => {
    const rawSubtotal = Math.round(areaM2 * unitRate * 100) / 100;
    
    // Minimum charge check
    const minimumChargeApplied = rawSubtotal < minimumServiceCharge;
    const baseWithMinimum = Math.max(rawSubtotal, minimumServiceCharge);

    // Height surcharge: +15% or $20 flat equipment setup
    const heightSurchargeAmount = hasHeightSurcharge ? Math.round(baseWithMinimum * 0.15 * 100) / 100 : 0;

    // Minor patching: flat $20
    const patchingRepairAmount = hasPatchingRepair ? 20 : 0;

    // Materials note / allowance (indicative)
    const paintMaterialsAmount = 0; // Hand labor focused, notes provided

    const total = Math.round((baseWithMinimum + heightSurchargeAmount + patchingRepairAmount) * 100) / 100;

    return {
      serviceId: activeService.id,
      serviceName: activeService.service_name,
      areaM2,
      pricePerM2: unitRate,
      subtotal: rawSubtotal,
      hasHeightSurcharge,
      heightSurchargeAmount,
      includePaintMaterials,
      paintMaterialsAmount,
      hasPatchingRepair,
      patchingRepairAmount,
      minimumServiceCharge,
      minimumChargeApplied,
      total,
      roomDetails: `${areaM2} m² en ${activeService.service_name}`,
    };
  }, [
    areaM2,
    unitRate,
    minimumServiceCharge,
    hasHeightSurcharge,
    hasPatchingRepair,
    includePaintMaterials,
    activeService,
  ]);

  const handleApplyDimensions = () => {
    const l = parseFloat(wallLength) || 0;
    const h = parseFloat(wallHeight) || 0;
    if (l > 0 && h > 0 && wallCount > 0) {
      const calculated = Math.round(l * h * wallCount);
      setAreaM2(Math.max(1, calculated));
      setCustomDimensionsOpen(false);
    }
  };

  const handleConfirm = () => {
    onConfirmCalculation(calculationResult, activeService);
  };

  return (
    <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#DED4C5]/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#0B72D9] font-bold text-xs uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" />
            <span>{t('painting.calculatorTitle', 'Calculadora de Pintura FIXIT')}</span>
          </div>
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F2421]">
            {t('painting.calculatorSubtitle', 'Calcula tu estimado exacto por m²')}
          </h3>
          <p className="text-xs text-[#756A5D] mt-0.5">
            {t('painting.calculatorRates', { minimum: minimumServiceCharge, defaultValue: `Tarifa transparente por metro cuadrado con mínimo de servicio de $${minimumServiceCharge}.00` })}
          </p>
        </div>
      </div>

      {/* 1. Selector de Tipo de Servicio de Pintura */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#1F2421] uppercase tracking-wider">
          {t('painting.step1', '1. Tipo de trabajo de pintura')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {paintingServices.map((srv) => {
            const isSelected = srv.id === activeService.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => setSelectedServiceId(srv.id)}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#0B72D9]/5 border-[#0B72D9] ring-1 ring-[#0B72D9]'
                    : 'bg-[#F6F4EF]/50 border-[#DED4C5] hover:border-[#0B72D9]/50'
                }`}
              >
                <div className="pr-2 min-w-0">
                  <p className="text-xs font-bold text-[#1F2421] truncate">{srv.service_name}</p>
                  <p className="text-[11px] text-[#756A5D] line-clamp-1">{srv.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-serif font-bold text-sm text-[#0B72D9]">
                    ${srv.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#756A5D] block">/ {t('common.m2', 'm²')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de Área (Metros Cuadrados) */}
      <div className="space-y-3 pt-2 border-t border-[#DED4C5]/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#1F2421] uppercase tracking-wider">
            {t('painting.step2', '2. Área a pintar (m²)')}
          </label>
          <button
            type="button"
            onClick={() => setCustomDimensionsOpen(!customDimensionsOpen)}
            className="text-[11px] text-[#0B72D9] hover:underline font-semibold cursor-pointer"
          >
            {customDimensionsOpen ? t('painting.calcHelperClose', 'Cerrar medidas') : t('painting.calcHelperOpen', '¿No sabes los m²? Calcular aquí')}
          </button>
        </div>

        {/* Dimension Helper Accordion */}
        {customDimensionsOpen && (
          <div className="bg-[#F6F4EF] p-4 rounded-2xl border border-[#DED4C5] space-y-3 text-xs">
            <p className="text-[#1F2421] font-semibold">
              {t('painting.helperInstruction', 'Calcula multiplicando el largo de las paredes por la altura:')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-[#756A5D] block mb-1">{t('painting.wallLength', 'Largo pared (m)')}</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={wallLength}
                  onChange={(e) => setWallLength(e.target.value)}
                  className="w-full bg-[#FFFEFA] border border-[#DED4C5] rounded-xl p-2 text-center font-bold text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#756A5D] block mb-1">{t('painting.wallHeight', 'Alto pared (m)')}</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(e.target.value)}
                  className="w-full bg-[#FFFEFA] border border-[#DED4C5] rounded-xl p-2 text-center font-bold text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#756A5D] block mb-1">{t('painting.wallCount', 'Nº Paredes')}</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={wallCount}
                  onChange={(e) => setWallCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#FFFEFA] border border-[#DED4C5] rounded-xl p-2 text-center font-bold text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyDimensions}
              className="w-full py-2 bg-[#0B72D9] text-white rounded-xl font-bold text-xs cursor-pointer active:scale-98"
            >
              {t('painting.applyArea', { area: (parseFloat(wallLength) || 0) * (parseFloat(wallHeight) || 0) * wallCount, defaultValue: `Aplicar área estimada (${(parseFloat(wallLength) || 0) * (parseFloat(wallHeight) || 0) * wallCount} m²)` })}
            </button>
          </div>
        )}

        {/* Stepper + Input */}
        <div className="flex items-center gap-3 bg-[#F6F4EF] p-2.5 rounded-2xl border border-[#DED4C5]">
          <button
            type="button"
            onClick={() => setAreaM2(Math.max(5, areaM2 - 5))}
            className="w-10 h-10 rounded-xl bg-[#FFFEFA] border border-[#DED4C5] flex items-center justify-center text-[#1F2421] hover:bg-[#DED4C5]/30 active:scale-95 cursor-pointer shadow-2xs"
            aria-label={t('painting.decreaseM2', 'Disminuir m2')}
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex-1 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                min="1"
                max="1000"
                value={areaM2}
                onChange={(e) => setAreaM2(Math.max(1, parseInt(e.target.value) || 0))}
                className="font-serif font-bold text-3xl sm:text-4xl text-[#1F2421] text-center w-24 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-bold text-[#756A5D]">{t('common.m2', 'm²')}</span>
            </div>
            <span className="text-[11px] text-[#756A5D]">
              ${unitRate.toFixed(2)} {t('painting.perM2', 'por m²')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAreaM2(areaM2 + 5)}
            className="w-10 h-10 rounded-xl bg-[#FFFEFA] border border-[#DED4C5] flex items-center justify-center text-[#1F2421] hover:bg-[#DED4C5]/30 active:scale-95 cursor-pointer shadow-2xs"
            aria-label={t('painting.increaseM2', 'Aumentar m2')}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Preset Pills */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ROOMS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setAreaM2(preset.m2)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                areaM2 === preset.m2
                  ? 'bg-[#0B72D9] text-white border-[#0B72D9]'
                  : 'bg-[#FFFEFA] text-[#756A5D] border-[#DED4C5] hover:bg-[#F6F4EF]'
              }`}
            >
              {t(`painting.presets.${preset.key}`, { defaultValue: preset.label })} ({preset.m2}{t('common.m2', 'm²')})
            </button>
          ))}
        </div>
      </div>

      {/* 3. Condiciones y Extras Opcionales */}
      <div className="space-y-2.5 pt-2 border-t border-[#DED4C5]/60">
        <label className="block text-xs font-bold text-[#1F2421] uppercase tracking-wider">
          {t('painting.step3', '3. Condiciones adicionales (Opcional)')}
        </label>

        {/* Altura > 3 metros */}
        <label className="flex items-start gap-3 p-3 rounded-2xl bg-[#F6F4EF]/50 border border-[#DED4C5] cursor-pointer hover:bg-[#F6F4EF] transition-colors">
          <input
            type="checkbox"
            checked={hasHeightSurcharge}
            onChange={(e) => setHasHeightSurcharge(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-[#0B72D9] rounded border-[#DED4C5] focus:ring-[#0B72D9]"
          />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2421]">{t('painting.heightSurchargeTitle', 'Altura superior a 3 metros')}</span>
              <span className="font-semibold text-[#0B72D9]">{t('painting.heightSurchargeBadge', '+15% trabajo en altura')}</span>
            </div>
            <p className="text-[#756A5D] text-[11px] mt-0.5">
              {t('painting.heightSurchargeDesc', 'Requiere escalera telescópica o andamio para doble altura o cielos rasos altos.')}
            </p>
          </div>
        </label>

        {/* Resane menor de huecos y pequeñas grietas */}
        <label className="flex items-start gap-3 p-3 rounded-2xl bg-[#F6F4EF]/50 border border-[#DED4C5] cursor-pointer hover:bg-[#F6F4EF] transition-colors">
          <input
            type="checkbox"
            checked={hasPatchingRepair}
            onChange={(e) => setHasPatchingRepair(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-[#0B72D9] rounded border-[#DED4C5] focus:ring-[#0B72D9]"
          />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2421]">{t('painting.patchingTitle', 'Resane de grietas y huecos menores')}</span>
              <span className="font-semibold text-[#0B72D9]">{t('painting.patchingBadge', '+$20.00')}</span>
            </div>
            <p className="text-[#756A5D] text-[11px] mt-0.5">
              {t('painting.patchingDesc', 'Empaste, masillado y lijado puntual de orificios de clavos, tarugos o pequeñas fisuras.')}
            </p>
          </div>
        </label>

        {/* Quién pone la pintura */}
        <div className="p-3 rounded-2xl bg-[#FFFEFA] border border-[#DED4C5] text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[#53653D] font-bold">
            <Info className="w-3.5 h-3.5" />
            <span>{t('painting.paintSupplyTitle', 'Suministro de la pintura')}</span>
          </div>
          <p className="text-[11px] text-[#756A5D] leading-relaxed">
            {t('painting.paintSupplyDesc', 'Las tarifas FIXIT reflejan la mano de obra profesional especializada (herramientas, rodillos, plásticos y cintas protectoras incluidas). Tú puedes suministrar la marca y color de tu preferencia, o podemos asesorarte con marcas recomendadas en Panamá (Glidden, Lanco, Protecto, Sur).')}
          </p>
        </div>
      </div>

      {/* 4. Desglose y Total Calculado */}
      <div className="bg-[#F6F4EF] rounded-2xl p-4 sm:p-5 border border-[#DED4C5] space-y-3">
        <span className="text-[11px] font-bold text-[#756A5D] uppercase tracking-wider block">
          {t('painting.breakdownTitle', 'Desglose del cálculo FIXIT')}
        </span>

        <div className="space-y-1.5 text-xs text-[#1F2421]">
          <div className="flex justify-between">
            <span className="text-[#756A5D]">
              {areaM2} {t('common.m2', 'm²')} × ${unitRate.toFixed(2)} ({activeService.service_name})
            </span>
            <span className="font-semibold">${calculationResult.subtotal.toFixed(2)}</span>
          </div>

          {calculationResult.minimumChargeApplied && (
            <div className="flex justify-between items-center text-[#B98A43] bg-[#B98A43]/10 px-2 py-1 rounded-lg text-[11px] font-semibold">
              <span>{t('painting.minimumChargeNotice', 'Tarifa mínima de servicio aplicada')}</span>
              <span>{t('painting.minimumCharge', { minimum: minimumServiceCharge, defaultValue: `Mínimo $${minimumServiceCharge}.00` })}</span>
            </div>
          )}

          {hasHeightSurcharge && (
            <div className="flex justify-between">
              <span className="text-[#756A5D]">{t('painting.heightSurchargeBreakdown', 'Recargo por altura (>3m)')}</span>
              <span className="font-semibold">+${calculationResult.heightSurchargeAmount.toFixed(2)}</span>
            </div>
          )}

          {hasPatchingRepair && (
            <div className="flex justify-between">
              <span className="text-[#756A5D]">{t('painting.patchingBreakdown', 'Resane puntual de huecos / fisuras')}</span>
              <span className="font-semibold">+${calculationResult.patchingRepairAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Total Final */}
        <div className="pt-3 border-t border-[#DED4C5] flex items-baseline justify-between">
          <div>
            <span className="font-bold text-sm text-[#1F2421] block">{t('painting.totalEstimated', 'Total Estimado')}</span>
            <span className="text-[10px] text-[#53653D] font-medium">{t('painting.guarantee', 'Garantía FIXIT 30-60 días')}</span>
          </div>
          <div className="text-right">
            <span className="font-serif font-bold text-3xl text-[#082D60]">
              ${calculationResult.total.toFixed(2)}
            </span>
            <span className="text-xs text-[#756A5D] ml-1">{t('common.currency', 'USD')}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
          id="btn-confirm-painting-calc"
        >
          <span>{t('painting.continueWithCalc', { total: calculationResult.total.toFixed(2), defaultValue: `Continuar con este cálculo ($${calculationResult.total.toFixed(2)})` })}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] transition-colors cursor-pointer"
          >
            {t('painting.backToService', 'Volver a información del servicio')}
          </button>
        )}
      </div>
    </div>
  );
};
