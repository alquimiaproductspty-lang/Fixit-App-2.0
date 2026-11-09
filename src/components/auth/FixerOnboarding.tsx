import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, authService, AuthState, uploadFixerPhoto } from '../../lib/firebase';
import { logAuditEvent, sanitizeForFirestore } from '../../lib/firestoreService';
import { FixitLogo } from '../FixitLogo';
import {
  Wrench,
  KeyRound,
  UserCheck,
  Camera,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Award,
  CreditCard,
  MapPin,
  Phone,
  User,
} from 'lucide-react';

export interface FixerOnboardingProps {
  authState: AuthState;
  profileOnlyMode?: boolean;
  onComplete?: () => void;
}

const ESPECIALIDADES = [
  'Plomería',
  'Electricidad',
  'Climatización',
  'Pintura residencial',
  'Reparaciones del hogar',
  'Aire Acondicionado',
  'Mantenimiento de techos',
  'Cerrajería',
  'Carpintería',
];

const IDONEIDAD_TIPOS = [
  'Ninguna',
  'Electricidad',
  'Plomería',
  'Climatización',
  'Otra',
] as const;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

// Foto de perfil desactivada por decisión del negocio (registro solo con datos).
// Para reactivar: poner en true + activar Storage/Blaze + publicar storage.rules.
const FIXER_PHOTO_ENABLED = false;

export const FixerOnboarding: React.FC<FixerOnboardingProps> = ({
  authState,
  profileOnlyMode = false,
  onComplete,
}) => {
  const currentUser = authState.user;

  const [step, setStep] = useState<1 | 2>(profileOnlyMode ? 2 : 1);
  const [inviteCode, setInviteCode] = useState('');
  const [remoteInviteCode, setRemoteInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (profileOnlyMode) return;
    let cancelled = false;
    getDoc(doc(db, 'settings', 'fixer_invite'))
      .then((snap) => {
        if (!cancelled && snap.exists()) {
          const code = String(snap.data()?.code || '').trim();
          setRemoteInviteCode(code || null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileOnlyMode]);

  const [nombre, setNombre] = useState(
    currentUser?.displayName || currentUser?.nombre || ''
  );
  const [telefono, setTelefono] = useState(currentUser?.phone || '');
  const [cedula, setCedula] = useState('');
  const [especialidad, setEspecialidad] = useState<string>(ESPECIALIDADES[0]);
  const [zonaCobertura, setZonaCobertura] = useState('');
  const [idoneidadTipo, setIdoneidadTipo] = useState<string>('Ninguna');
  const [idoneidadNumero, setIdoneidadNumero] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMsg('El archivo seleccionado debe ser una imagen válida (JPG, PNG o WEBP).');
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMsg(
        `La foto supera el tamaño máximo permitido de 5 MB (tamaño actual: ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)} MB). Elige o toma una foto más liviana.`
      );
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleStep1Continue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanCode = inviteCode.trim();
    if (!cleanCode) {
      setErrorMsg('Ingresa tu código de invitación.');
      return;
    }

    // Releer siempre el código vigente: el admin puede haber generado uno nuevo
    // después de montar esta pantalla y el valor eager quedaría obsoleto.
    let expectedCode = remoteInviteCode;
    try {
      const snap = await getDoc(doc(db, 'settings', 'fixer_invite'));
      expectedCode = snap.exists() ? (String(snap.data()?.code || '').trim() || null) : null;
      setRemoteInviteCode(expectedCode);
    } catch {
      // Sin red o sin permiso de lectura: usar el valor eager como fallback.
      if (!expectedCode) {
        setErrorMsg('No se pudo verificar el código de invitación. Verifica tu conexión.');
        return;
      }
    }

    // Comparación insensible a mayúsculas (el generador solo emite mayúsculas)
    // y se guarda normalizado porque el servidor compara exacto en el paso 2.
    const normalizedCode = cleanCode.toUpperCase();
    if (!expectedCode || normalizedCode !== expectedCode.toUpperCase()) {
      setErrorMsg('Código inválido, pídelo a tu supervisor');
      return;
    }

    setInviteCode(normalizedCode);
    setStep(2);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser?.uid) {
      setErrorMsg('Sesión no encontrada. Inicia sesión nuevamente.');
      return;
    }

    const cleanNombre = nombre.trim();
    const cleanTelefono = telefono.trim();
    const cleanCedula = cedula.trim();
    const cleanZona = zonaCobertura.trim();
    const cleanIdoneidadNum =
      idoneidadTipo !== 'Ninguna' ? idoneidadNumero.trim() : '';

    if (!cleanNombre) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }
    if (!cleanTelefono) {
      setErrorMsg('El número de teléfono es obligatorio.');
      return;
    }
    const phoneDigits = cleanTelefono.replace(/\D/g, '');
    if (!/^[+\d\s-]+$/.test(cleanTelefono) || phoneDigits.length < 7) {
      setErrorMsg(
        'Ingresa un número de teléfono válido (al menos 7 dígitos; se permiten +, espacios y guiones).'
      );
      return;
    }
    if (!cleanCedula) {
      setErrorMsg('El número de cédula es obligatorio (ej. 8-123-456).');
      return;
    }
    if (!cleanZona) {
      setErrorMsg('La zona de cobertura es obligatoria.');
      return;
    }
    if (idoneidadTipo !== 'Ninguna' && !cleanIdoneidadNum) {
      setErrorMsg('Ingresa el número de tu idoneidad profesional.');
      return;
    }
    if (FIXER_PHOTO_ENABLED && !photoFile) {
      setErrorMsg('Debes subir o tomar tu foto de perfil para completar el registro.');
      return;
    }
    if (photoFile && photoFile.size > MAX_PHOTO_BYTES) {
      setErrorMsg('La foto supera el límite máximo de 5 MB.');
      return;
    }

    setIsSubmitting(true);
    const uid = currentUser.uid;
    const now = new Date().toISOString();
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();

    // 1. Subir primero la foto a Firebase Storage (si el flag está activo); si falla, abortar sin escribir docs
    let uploadedPhotoUrl = '';
    if (FIXER_PHOTO_ENABLED && photoFile) {
      try {
        uploadedPhotoUrl = await uploadFixerPhoto(uid, photoFile);
      } catch (uploadErr: any) {
        console.error('[FixerOnboarding] Error al subir foto de perfil:', uploadErr);
        setErrorMsg(
          uploadErr?.message ||
            'No se pudo subir la foto de perfil. Verifica tu conexión e inténtalo de nuevo.'
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 2. Actualizar users/{uid} a TECHNICIAN con código de invitación (salvo modo solo-perfil)
      if (!profileOnlyMode) {
        const userRef = doc(db, 'users', uid);
        const existingSnap = await getDoc(userRef);

        if (!existingSnap.exists()) {
          // Si users/{uid} no existe aún (race con sync inicial), crearlo primero como CLIENT
          await setDoc(userRef, {
            uid,
            email: cleanEmail,
            displayName: cleanNombre,
            phone: cleanTelefono,
            photoURL: uploadedPhotoUrl,
            role: 'CLIENT',
            status: 'activo',
            city: 'Ciudad de Panamá',
            createdAt: now,
            updatedAt: now,
          });
        }

        try {
          await updateDoc(userRef, {
            displayName: cleanNombre,
            phone: cleanTelefono,
            photoURL: uploadedPhotoUrl,
            role: 'TECHNICIAN',
            technicianId: uid,
            inviteCode: inviteCode.trim(),
            onboardingCompletedAt: now,
            updatedAt: now,
          });
        } catch {
          setErrorMsg('Código inválido, pídelo a tu supervisor');
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Crear/actualizar ficha oficial en fixers/{uid}
      const fixerDoc = sanitizeForFirestore({
        id: uid,
        uid,
        nombre: cleanNombre,
        telefono: cleanTelefono,
        correo: cleanEmail,
        cedula: cleanCedula,
        idoneidad_tipo: idoneidadTipo,
        idoneidad_numero: cleanIdoneidadNum,
        photoURL: uploadedPhotoUrl,
        especialidad,
        zona_cobertura: cleanZona,
        disponibilidad: 'Disponible' as const,
        activo: true,
        calificacion: null,
        trabajos_realizados: 0,
        createdAt: now,
        updatedAt: now,
      });

      await setDoc(doc(db, 'fixers', uid), fixerDoc);

      // 4. Crear/actualizar espejo en technicians/{uid} (+ tipo_relacion: 'contratista')
      const technicianDoc = sanitizeForFirestore({
        ...fixerDoc,
        status: 'activo',
        tipo_relacion: 'contratista' as const,
        servicios_completados: 0,
      });

      await setDoc(doc(db, 'technicians', uid), technicianDoc);

      // 5. Registrar evento de auditoría AUTORREGISTRO_FIXER
      await logAuditEvent(
        'AUTORREGISTRO_FIXER',
        'fixers',
        uid,
        cleanNombre,
        uid,
        'Técnico',
        {
          especialidad,
          zona_cobertura: cleanZona,
          idoneidad_tipo: idoneidadTipo,
          idoneidad_numero: cleanIdoneidadNum,
          modo: profileOnlyMode ? 'solo_perfil' : 'codigo_invitacion',
        }
      );

      // 6. Refrescar perfil en memoria para activar consola técnica de inmediato
      await authService.refreshProfile();
      onComplete?.();
    } catch (err: any) {
      console.error('[FixerOnboarding] Error al guardar perfil fixer:', err);
      const code = String(err?.code || '').toLowerCase();
      if (code.includes('permission-denied') && !profileOnlyMode) {
        setErrorMsg('Código inválido, pídelo a tu supervisor');
      } else {
        setErrorMsg(
          err?.message || 'Ocurrió un error al guardar tu ficha de Fixer. Inténtalo de nuevo.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#DED4C5]/70 pb-4">
          <div className="flex items-center gap-3">
            <FixitLogo variant="compact" size={32} />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B72D9] block">
                Onboarding Oficial de Técnicos
              </span>
              <h1 className="font-serif font-bold text-lg sm:text-xl text-[#1F2421]">
                {profileOnlyMode
                  ? 'Completa tu Ficha de Fixer'
                  : step === 1
                  ? 'Activación de Cuenta Fixer'
                  : 'Tu Perfil Profesional FIXIT'}
              </h1>
            </div>
          </div>

          {!profileOnlyMode && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#082D60]/10 text-[#082D60]">
              Paso {step} de 2
            </span>
          )}
        </div>

        {/* Cuenta conectada */}
        <div className="p-3 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5]/80 flex items-center justify-between gap-2 text-xs">
          <div className="truncate">
            <span className="text-[#756A5D] block text-[10px] uppercase font-bold">
              Sesión iniciada como
            </span>
            <span className="font-bold text-[#1F2421] truncate block">
              {currentUser?.email || currentUser?.displayName || 'Usuario autenticado'}
            </span>
          </div>
          <Wrench className="w-4 h-4 text-[#0B72D9] shrink-0" />
        </div>

        {/* Alerta de error */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PASO 1: CÓDIGO DE INVITACIÓN */}
        {step === 1 && !profileOnlyMode && (
          <form onSubmit={handleStep1Continue} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="fixer-invite-code-input"
                className="text-xs font-bold text-[#1F2421] flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#082D60]" />
                <span>Código de invitación de Fixer *</span>
              </label>
              <p className="text-[11px] text-[#756A5D] leading-relaxed">
                Para darte de alta como técnico oficial en la plataforma, ingresa el código de
                invitación proporcionado por tu supervisor de FIXIT Panamá.
              </p>
              <input
                id="fixer-invite-code-input"
                type="text"
                required
                placeholder="Ej. FIXIT-XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full px-4 py-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] font-mono font-bold text-sm text-[#082D60] tracking-wider uppercase focus:outline-hidden focus:border-[#0B72D9]"
              />
            </div>

            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0B72D9] hover:bg-[#0962BC] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <span>Continuar al Perfil</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* PASO 2: FORMULARIO DE PERFIL PROFESIONAL */}
        {step === 2 && (
          <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs">
            {FIXER_PHOTO_ENABLED && (
              <>
            {/* Foto de perfil obligatoria */}
            <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5] space-y-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="fixer-photo-input"
                  className="font-bold text-[#1F2421] flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-[#0B72D9]" />
                  <span>Foto de perfil (obligatoria, máx. 5 MB) *</span>
                </label>
                {photoFile && (
                  <span className="text-[10px] font-bold text-[#53653D] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Lista
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-[#FFFEFA] border border-[#DED4C5] flex items-center justify-center overflow-hidden shrink-0">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Vista previa de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-[#756A5D]" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    id="fixer-photo-input"
                    type="file"
                    accept="image/*"
                    capture="user"
                    required
                    onChange={handlePhotoChange}
                    className="block w-full text-[11px] text-[#756A5D] file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#082D60] file:text-white hover:file:bg-[#07244D] file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-[10px] text-[#756A5D]">
                    Usa una foto clara de tu rostro para tu credencial de técnico verificado.
                  </p>
                </div>
              </div>
            </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-bold text-[#1F2421] flex items-center gap-1">
                  <User className="w-3 h-3 text-[#082D60]" />
                  <span>Nombre completo *</span>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-medium focus:outline-hidden focus:border-[#0B72D9]"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-bold text-[#1F2421] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#082D60]" />
                  <span>Teléfono (WhatsApp) *</span>
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 6234-5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono focus:outline-hidden focus:border-[#0B72D9]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-bold text-[#1F2421] flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-[#082D60]" />
                  <span>Cédula / Identificación *</span>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ej. 8-123-456"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono focus:outline-hidden focus:border-[#0B72D9]"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-bold text-[#1F2421] flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-[#082D60]" />
                  <span>Especialidad principal *</span>
                </span>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-semibold focus:outline-hidden focus:border-[#0B72D9]"
                >
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-bold text-[#1F2421] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#082D60]" />
                <span>Zona de cobertura *</span>
              </span>
              <input
                type="text"
                required
                placeholder="Ej. San Francisco, Bella Vista, Costa del Este"
                value={zonaCobertura}
                onChange={(e) => setZonaCobertura(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] focus:outline-hidden focus:border-[#0B72D9]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-bold text-[#1F2421] flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#082D60]" />
                  <span>Idoneidad profesional</span>
                </span>
                <select
                  value={idoneidadTipo}
                  onChange={(e) => {
                    setIdoneidadTipo(e.target.value);
                    if (e.target.value === 'Ninguna') {
                      setIdoneidadNumero('');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-semibold focus:outline-hidden focus:border-[#0B72D9]"
                >
                  {IDONEIDAD_TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>

              {idoneidadTipo !== 'Ninguna' && (
                <label className="block space-y-1">
                  <span className="font-bold text-[#1F2421]">
                    Número de idoneidad ({idoneidadTipo}) *
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. JTIA-2024-889"
                    value={idoneidadNumero}
                    onChange={(e) => setIdoneidadNumero(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono focus:outline-hidden focus:border-[#0B72D9]"
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {!profileOnlyMode && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setErrorMsg(null);
                    setStep(1);
                  }}
                  className="py-3 px-3.5 rounded-2xl border border-[#DED4C5] hover:bg-[#F6F4EF] text-[#1F2421] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#53653D] hover:bg-[#435331] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Subiendo foto y activando perfil...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirmar y Activar Perfil Fixer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Botón "No tengo código / salir" */}
        <div className="pt-2 border-t border-[#DED4C5]/60">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => authService.signOut()}
            className="w-full py-2.5 px-4 rounded-xl border border-[#DED4C5] hover:bg-[#F6F4EF] text-[#756A5D] hover:text-rose-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>No tengo código / salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
