import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock
} from 'lucide-react';

interface ProblemDetailStepProps {
  service: Service;
  description: string;
  onChangeDescription: (desc: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const ProblemDetailStep: React.FC<ProblemDetailStepProps> = ({
  service,
  description,
  onChangeDescription,
  onContinue,
  onBack,
}) => {
  // Estados de la Agenda
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false); // Para mostrar que está cargando

  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const availableTimes = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'];

  // === MAGIA REAL: CONEXIÓN A FIRESTORE ===
  useEffect(() => {
    if (!selectedDate) return;

    const fetchBookedTimes = async () => {
      setIsLoadingTimes(true);
      setBookedTimes([]); // Limpiamos las horas previas
      
      try {
        // Formateamos la fecha a YYYY-MM-DD para buscarla exacto en la base de datos
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Hacemos la pregunta a Firebase: "Tráeme todas las citas de este día"
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef, where('date', '==', dateString));
        const querySnapshot = await getDocs(q);

        // Extraemos las horas de esas citas
        const occupied = querySnapshot.docs.map(doc => doc.data().time);
        setBookedTimes(occupied);
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          handleFirestoreError(error, OperationType.LIST, 'appointments');
        } else {
          console.warn("Disponibilidad en modo sin conexión o error de red:", error);
          setBookedTimes([]);
        }
      } finally {
        setIsLoadingTimes(false);
      }
    };

    fetchBookedTimes();
  }, [selectedDate]); // Se ejecuta cada vez que el cliente cambia de día

  const getDynamicPlaceholder = () => {
    const cat = (service.category || '').toLowerCase();
    if (cat.includes('plom')) return 'Ejemplo: Deseo instalar una grifería nueva en el lavamanos o conectar la lavadora...';
    if (cat.includes('elec')) return 'Ejemplo: Necesito instalar una lámpara colgante o cambiar unos tomacorrientes...';
    if (cat.includes('pintur')) return 'Ejemplo: Deseo pintar 2 habitaciones interiores y reparar unas grietas leves...';
    return 'Ejemplo: Necesito colgar un soporte de TV, ajustar una cerradura o armar un mueble...';
  };

  const handleContinueWithAgenda = () => {
    let finalDescription = description;
    
    if (selectedDate && selectedTime) {
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = selectedDate.toLocaleDateString('es-PA', dateOptions);
      
      // Formato YYYY-MM-DD oculto para que tú como admin lo copies fácil si es necesario
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const systemDate = `${year}-${month}-${day}`;

      const agendaInfo = `\n\n📅 *CITA SOLICITADA:*\nDía: ${formattedDate}\nHora: ${selectedTime}\n(Ref: ${systemDate})`;
      
      const cleanDescription = description.split('\n\n📅 *CITA SOLICITADA:*')[0];
      finalDescription = cleanDescription + agendaInfo;
      
      onChangeDescription(finalDescription);
    }
    
    onContinue();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
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
                      setSelectedTime(null);
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
                {isLoadingTimes ? 'Buscando disponibilidad...' : 'Horarios disponibles:'}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableTimes.map((time, idx) => {
                  const isBooked = bookedTimes.includes(time);
                  const isSelected = selectedTime === time;
                  
                  return (
                    <button
                      key={idx}
                      disabled={isBooked || isLoadingTimes}
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
            value={description.split('\n\n📅 *CITA SOLICITADA:*')[0]}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={getDynamicPlaceholder()}
            rows={3}
            className="w-full mt-1 p-3.5 bg-[#F6F4EF]/60 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0B72D9] rounded-2xl text-sm text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all resize-none leading-relaxed"
          />
        </div>

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
