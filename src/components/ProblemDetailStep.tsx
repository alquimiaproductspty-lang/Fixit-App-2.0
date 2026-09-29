import React, { useRef, useState } from 'react';
import { Service } from '../types';
import { compressImage } from '../lib/imageCompressor';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  RefreshCw,
} from 'lucide-react';

interface ProblemDetailStepProps {
  service: Service;
  description: string;
  onChangeDescription: (desc: string) => void;
  photos: string[];
  onChangePhotos: (photos: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const ProblemDetailStep: React.FC<ProblemDetailStepProps> = ({
  service,
  description,
  onChangeDescription,
  photos,
  onChangePhotos,
  onContinue,
  onBack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Dynamic placeholder tailored to the service category as requested
  const getDynamicPlaceholder = () => {
    const cat = (service.category || '').toLowerCase();
    if (cat.includes('plom')) {
      return 'Ejemplo: Deseo instalar una grifería nueva en el lavamanos o conectar la lavadora...';
    }
    if (cat.includes('elec')) {
      return 'Ejemplo: Necesito instalar una lámpara colgante o cambiar unos tomacorrientes...';
    }
    if (cat.includes('pintur')) {
      return 'Ejemplo: Deseo pintar 2 habitaciones interiores y reparar unas grietas leves en la pared...';
    }
    return 'Ejemplo: Necesito colgar un soporte de TV, ajustar una cerradura o armar un mueble...';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (replaceIndex !== null) {
      // Replacing a single photo at replaceIndex
      const file = files[0];
      if (!file) return;
      setIsProcessingPhoto(true);
      try {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(rawBase64, 1024, 1024, 0.75);
        const updated = [...photos];
        updated[replaceIndex] = compressed;
        onChangePhotos(updated);
      } catch (err) {
        console.error('Error reemplazando imagen:', err);
      } finally {
        setIsProcessingPhoto(false);
        setReplaceIndex(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      return;
    }

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = (Array.from(files) as File[]).slice(0, remainingSlots);
    setIsProcessingPhoto(true);

    try {
      const newBase64s: string[] = [];

      for (const file of filesToProcess) {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Compress image to reasonable size for performance
        const compressed = await compressImage(rawBase64, 1024, 1024, 0.75);
        newBase64s.push(compressed);
      }

      onChangePhotos([...photos, ...newBase64s]);
    } catch (err) {
      console.error('Error procesando imagen:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    onChangePhotos(updated);
  };

  const handleStartReplace = (index: number) => {
    setReplaceIndex(index);
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95"
          id="btn-back-to-price"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Volver al precio</span>
        </button>

        {/* Compact Service & Price Pill */}
        <div className="flex items-center gap-2 bg-[#FFFEFA] border border-[#DED4C5] px-3 py-1 rounded-full text-xs font-medium text-[#1F2421]">
          <span className="truncate max-w-[170px]">{service.service_name}</span>
          <span className="text-[#DED4C5]">|</span>
          <span className="font-bold text-[#0B72D9]">
            {service.diagnostic_required ? `$${service.diagnostic_price}` : `$${service.price}`}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-xs space-y-6">
        {/* SECTION 6: DESCRIPCIÓN DEL PROBLEMA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1F2421]">
              Cuéntanos un poco más
            </h2>
            <span className="text-[11px] text-[#756A5D] font-medium bg-[#F6F4EF] px-2 py-0.5 rounded-md">
              Opcional
            </span>
          </div>
          <p className="text-xs text-[#756A5D]">
            Describe brevemente qué está pasando para que el técnico prepare los materiales adecuados:
          </p>

          <textarea
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={getDynamicPlaceholder()}
            rows={4}
            className="w-full mt-1 p-3.5 bg-[#F6F4EF]/60 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0B72D9] rounded-2xl text-sm text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all resize-none leading-relaxed"
            id="input-problem-description"
          />
        </div>

        {/* SECTION 7: NUEVA SECCIÓN DE FOTOGRAFÍAS */}
        <div className="space-y-3 pt-2 border-t border-[#DED4C5]/60">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F2421] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0B72D9]" />
                <span>Agrega fotos del problema</span>
              </h3>
              <span className="text-xs font-semibold text-[#756A5D]">
                {photos.length}/3 fotos
              </span>
            </div>
            <p className="text-xs text-[#756A5D] mt-0.5">
              Puedes agregar hasta 3 fotos para ayudarnos a entender mejor el trabajo.
            </p>
          </div>

          {/* Hidden File Input supporting Camera and Gallery */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple={photos.length < 2}
            className="hidden"
            id="file-upload-photos"
          />

          {/* 3 Visual Photo Slots: [ + Foto ] [ + Foto ] [ + Foto ] */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((slotIndex) => {
              const photoUrl = photos[slotIndex];

              if (photoUrl) {
                // Occupied Slot: Display thumbnail with change/replace and delete buttons
                return (
                  <div
                    key={`slot-${slotIndex}`}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-[#DED4C5] shadow-2xs group bg-[#1F2421]/5"
                  >
                    <img
                      src={photoUrl}
                      alt={`Foto ${slotIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Action buttons: Replace and Delete */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartReplace(slotIndex)}
                        className="w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
                        title="Cambiar fotografía"
                        aria-label="Cambiar fotografía"
                      >
                        <RefreshCw className="w-3 h-3 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(slotIndex)}
                        className="w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90"
                        title="Eliminar foto"
                        aria-label="Eliminar foto"
                      >
                        <Trash2 className="w-3 h-3 stroke-[2.2]" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      Foto {slotIndex + 1}
                    </div>
                  </div>
                );
              }

              // Empty Slot: [ + Foto ]
              return (
                <button
                  key={`slot-${slotIndex}`}
                  type="button"
                  onClick={() => {
                    setReplaceIndex(null);
                    fileInputRef.current?.click();
                  }}
                  disabled={isProcessingPhoto}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#DED4C5] hover:border-[#0B72D9] bg-[#F6F4EF]/40 hover:bg-[#0B72D9]/5 flex flex-col items-center justify-center p-2 text-[#756A5D] hover:text-[#0B72D9] transition-all active:scale-95 group"
                  id={`btn-add-photo-${slotIndex + 1}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFFEFA] border border-[#DED4C5] group-hover:border-[#0B72D9] flex items-center justify-center mb-1 text-[#0B72D9] shadow-2xs">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold">+ Foto</span>
                </button>
              );
            })}
          </div>

          {/* Technical clarification notice */}
          <div className="bg-[#F6F4EF] rounded-xl p-3 text-[11px] text-[#756A5D] flex items-start gap-2 border border-[#DED4C5]/60">
            <Info className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Puedes cargar hasta 3 fotos para verificar detalles del problema. Al continuar hacia WhatsApp, el mensaje reflejará la cantidad seleccionada para que las adjuntes con facilidad en el chat.
            </p>
          </div>
        </div>

        {/* Primary Continue Button */}
        <div className="pt-2">
          <button
            onClick={onContinue}
            className="w-full py-4 px-6 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            id="btn-continue-to-summary"
          >
            <span>Continuar al resumen</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
