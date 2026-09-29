import React, { useRef, useState, useEffect } from 'react';
import { Service } from '../types';
import { compressImage } from '../lib/imageCompressor';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Trash2,
  Plus,
  Info,
  RefreshCw,
  Calendar,
  Clock
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

  // --- NUEVO ESTADO PARA LA AGENDA ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]); // Aquí Firebase inyectará las horas ocupadas

  // Generar los próximos 7 días laborables
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1); // Empezar desde mañana
    return d;
  });

  // Horarios de trabajo por defecto
  const availableTimes = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'];

  // Simulación de conexión a Firebase (Opción C)
  useEffect(() => {
    if (!selectedDate) return;
    
    // NOTA PARA EL DESARROLLADOR (TÚ):
    // Aquí es donde haremos la consulta a Firestore Database en el futuro.
    // Ejemplo: const querySnapshot = await getDocs(query(collection(db, 'citas'), where('fecha', '==', selectedDate)));
    // Por ahora, simulamos que a veces las 10:00 AM están ocupadas para ver el efecto visual.
    
    setBookedTimes([]); // Reiniciamos horas ocupadas
    if (selectedDate.getDate() % 2 === 0) {
      setBookedTimes(['10:00 AM', '02:00 PM']); // Simula horas ocupadas en días pares
    }
  }, [selectedDate]);

  const getDynamicPlaceholder = () => {
    const cat = (service.category || '').toLowerCase();
    if (cat.includes('plom')) return 'Ejemplo: Deseo instalar una grifería nueva en el lavamanos o conectar la lavadora...';
    if (cat.includes('elec')) return 'Ejemplo: Necesito instalar una lámpara colgante o cambiar unos tomacorrientes...';
    if (cat.includes('pintur')) return 'Ejemplo: Deseo pintar 2 habitaciones interiores y reparar unas grietas leves...';
    return 'Ejemplo: Necesito colgar un soporte de TV, ajustar una cerradura o armar un mueble...';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (replaceIndex !== null) {
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
        if (fileInputRef.current) fileInputRef.current.value = '';
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
        const compressed = await compressImage(rawBase64, 1024, 1024, 0.75);
        newBase64s.push(compressed);
      }
      onChangePhotos([...photos, ...newBase64s]);
    } catch (err) {
      console.error('Error procesando imagen:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // --- MAGIA DE INYECCIÓN DE WHATSAPP ---
  const handleContinueWithAgenda = () => {
    let finalDescription = description;
    
    // Si el usuario eligió fecha y hora, lo inyectamos ocultamente en la descripción
    if (selectedDate && selectedTime) {
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = selectedDate.toLocaleDateString('es-PA', dateOptions);
      const agendaInfo = `\n\n📅 *CITA SOLICITADA:*\nDía: ${formattedDate}\nHora: ${selectedTime}`;
      
      // Limpiamos inyecciones anteriores si el usuario regresó y cambió la hora
      const cleanDescription = description.split('\n\n📅 *CITA SOLICITADA:*')[0];
      finalDescription = cleanDescription + agendaInfo;
      
      onChangeDescription(finalDescription);
    }
    
    onContinue();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Botón Volver y Pill de Precio */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Volver al precio</span>
        </button>

        <div className="flex items-center gap-2 bg-[#FFFEFA] border border-[#DED4C5] px-3 py-1 rounded-full text-xs font-medium text-[#1F2421]">
          <span className="truncate max-w-[170px]">{service.service_name}</span>
          <span className="text-[#DED4C5]">|</span>
          <span className="font-bold text-[#0B72D9]">
            {service.diagnostic_required ? `$${service.diagnostic_price}` : `$${service.price}`}
          </span>
        </div>
      </div>

      <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-xs space-y-7">
        
        {/* --- NUEVA SECCIÓN DE AGENDA PREMIUM --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#DED4C5]/60 pb-2">
            <Calendar className="w-5 h-5 text-[#0B72D9]" />
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1F2421]">
              ¿Cuándo necesitas la visita?
            </h2>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs text-[#756A5D] font-medium">Selecciona un día:</p>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              {upcomingDates.map((date, idx) => {
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const dayName = date.toLocaleDateString('es-PA', { weekday: 'short' });
                const dayNum = date.getDate();
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTime(null); // Resetear hora si cambia de día
                    }}
                    className={`snap-center shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all active:scale-95 ${
                      isSelected 
                        ? 'border-[#0B72D9] bg-[#0B72D9] text-white shadow-md' 
                        : 'border-[#DED4C5] bg-[#F6F4EF]/50 text-[#756A5D] hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">{dayName}</span>
                    <span className={`text-xl font-black ${isSelected ? 'text-white' : 'text-[#1F2421]'}`}>{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-3 pt-2 animation-fade-in">
              <p className="text-xs text-[#756A5D] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horarios disponibles:
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableTimes.map((time, idx) => {
                  const isBooked = bookedTimes.includes(time);
                  const isSelected = selectedTime === time;
                  
                  return (
                    <button
                      key={idx}
                      disabled={isBooked}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                        isBooked 
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed line-through' 
                          : isSelected
                            ? 'bg-[#0B72D9]/10 border-[#0B72D9] text-[#0B72D9]'
                            : 'bg-white border-[#DED4C5] text-[#1F2421] hover:border-[#0B72D9]/50'
                      }`}
                    >
                      {time} {isBooked && '(Ocupado)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN DE DESCRIPCIÓN */}
        <div className="space-y-2 pt-4 border-t border-[#DED4C5]/60">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#1F2421]">
              Detalle del problema
            </h2>
            <span className="text-[11px] text-[#756A5D] font-medium bg-[#F6F4EF] px-2 py-0.5 rounded-md">
              Opcional
            </span>
          </div>
          
          <textarea
            value={description.split('\n\n📅 *CITA SOLICITADA:*')[0]} // Mostrar solo la parte escrita por el usuario
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={getDynamicPlaceholder()}
            rows={3}
            className="w-full mt-1 p-3.5 bg-[#F6F4EF]/60 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0B72D9] rounded-2xl text-sm text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all resize-none leading-relaxed"
          />
        </div>

        {/* SECCIÓN DE FOTOGRAFÍAS */}
        <div className="space-y-3 pt-2 border-t border-[#DED4C5]/60">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F2421] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0B72D9]" />
                <span>Fotos del problema</span>
              </h3>
              <span className="text-xs font-semibold text-[#756A5D]">
                {photos.length}/3 fotos
              </span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple={photos.length < 2}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((slotIndex) => {
              const photoUrl = photos[slotIndex];

              if (photoUrl) {
                return (
                  <div key={`slot-${slotIndex}`} className="relative aspect-square rounded-2xl overflow-hidden border border-[#DED4C5] shadow-2xs group bg-[#1F2421]/5">
                    <img src={photoUrl} alt={`Foto ${slotIndex + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                      <button type="button" onClick={() => handleStartReplace(slotIndex)} className="w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => handleRemovePhoto(slotIndex)} className="w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={`slot-${slotIndex}`}
                  type="button"
                  onClick={() => { setReplaceIndex(null); fileInputRef.current?.click(); }}
                  disabled={isProcessingPhoto}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#DED4C5] hover:border-[#0B72D9] bg-[#F6F4EF]/40 flex flex-col items-center justify-center p-2 text-[#756A5D] hover:text-[#0B72D9] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFFEFA] border border-[#DED4C5] flex items-center justify-center mb-1 text-[#0B72D9]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">+ Foto</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón Continuar Modificado */}
        <div className="pt-2">
          <button
            onClick={handleContinueWithAgenda}
            disabled={!selectedDate || !selectedTime}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
              selectedDate && selectedTime
                ? 'bg-[#0B72D9] hover:bg-[#0962BC] text-white hover:shadow'
                : 'bg-[#DED4C5] text-[#756A5D] cursor-not-allowed opacity-70'
            }`}
          >
            <span>Continuar al resumen</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
