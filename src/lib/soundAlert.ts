/**
 * FIXIT Alertas Sonoras en Primer Plano (Estilo Uber - Fase 1)
 * Genera un chime de 2 tonos mediante Web Audio API (sin archivos externos, 100% offline).
 * Incluye desbloqueo silencioso en el primer gesto del usuario y control de mute en localStorage.
 */

const SOUND_STORAGE_KEY = 'fixit_sound_enabled';

export type SoundAlertVariant = 'fixer' | 'admin';

let sharedAudioCtx: AudioContext | null = null;
let unlockListenersAttached = false;

function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;
  return typeof Ctx === 'function' ? Ctx : null;
}

function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
      return sharedAudioCtx;
    }
    const Ctx = getAudioContextConstructor();
    if (!Ctx) return null;
    sharedAudioCtx = new Ctx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function tryUnlockAudioContext(): void {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Silencioso: se reintentará en el siguiente gesto del usuario
      });
    }
    if (ctx.state === 'running' && typeof window !== 'undefined') {
      window.removeEventListener('click', tryUnlockAudioContext, true);
      window.removeEventListener('touchstart', tryUnlockAudioContext, true);
      window.removeEventListener('keydown', tryUnlockAudioContext, true);
      unlockListenersAttached = false;
    }
  } catch {
    // Nunca lanzar errores de audio en consola
  }
}

export function initSoundAlertUnlock(): void {
  try {
    if (typeof window === 'undefined' || unlockListenersAttached) return;
    unlockListenersAttached = true;
    window.addEventListener('click', tryUnlockAudioContext, { capture: true, passive: true });
    window.addEventListener('touchstart', tryUnlockAudioContext, { capture: true, passive: true });
    window.addEventListener('keydown', tryUnlockAudioContext, { capture: true, passive: true });
  } catch {
    // Ignorar en entornos sin DOM
  }
}

// Registrar listeners de desbloqueo al cargar el módulo en el navegador
initSoundAlertUnlock();

export function isSoundEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false' && raw !== '0';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignorar si localStorage está bloqueado
  }
}

function scheduleTwoToneChime(ctx: AudioContext, variant: SoundAlertVariant): void {
  try {
    const now = ctx.currentTime;

    // Variante aguda para Fixer (A5 -> D6) | Variante grave para Admin (C5 -> E5)
    const [freq1, freq2] =
      variant === 'fixer' ? [880, 1174.66] : [523.25, 659.25];
    const waveType: OscillatorType = variant === 'fixer' ? 'triangle' : 'sine';

    const playNote = (freq: number, startTime: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    };

    playNote(freq1, now, 0.16, 0.28);
    playNote(freq2, now + 0.17, 0.30, 0.32);
  } catch {
    // Fallo silencioso
  }
}

export function playNewOrderSound(variant: SoundAlertVariant): void {
  try {
    if (!isSoundEnabled()) return;

    if (
      variant === 'fixer' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Algunos navegadores restringen vibrate sin gesto previo
      }
    }

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            scheduleTwoToneChime(ctx, variant);
          }
        })
        .catch(() => {
          // Reintento silencioso en próximo gesto
          initSoundAlertUnlock();
        });
      return;
    }

    scheduleTwoToneChime(ctx, variant);
  } catch {
    // Nunca debe romper la UI
  }
}

