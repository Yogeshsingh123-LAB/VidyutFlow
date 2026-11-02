import { IncidentSeverity } from '../types';

const STORAGE_KEY = 'vidyutflow_audio_alerts_enabled';

/**
 * Check if audio alerts are enabled by the user.
 * Defaults to true for utility operations awareness, but respects explicit user preference.
 */
export function isAudioAlertsEnabled(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true; // default enabled
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist user preference for audio notifications.
 */
export function setAudioAlertsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore sandbox storage quota errors
  }
}

/**
 * Toggle audio alerts on/off. Returns new state.
 */
export function toggleAudioAlerts(): boolean {
  const next = !isAudioAlertsEnabled();
  setAudioAlertsEnabled(next);
  return next;
}

// Reusable audio context singleton
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a professional, gentle two-tone chime for WARNING incidents (e.g. D5 587Hz -> A5 880Hz).
 */
export function playWarningChime(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Smooth frequency transition
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

    // Smooth envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // Non-fatal audio fallback
  }
}

/**
 * Play an authoritative, distinctive 3-pulse emergency tone for CRITICAL incidents (e.g. SCADA 11kV trips, thermal alert).
 */
export function playCriticalEmergencyTone(): void {
  if (!isAudioAlertsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const pulses = [
      { time: now, freq: 880 },
      { time: now + 0.14, freq: 880 },
      { time: now + 0.28, freq: 1046.5 } // C6 urgent finish
    ];

    pulses.forEach(p => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p.freq, p.time);

      gain.gain.setValueAtTime(0.001, p.time);
      gain.gain.exponentialRampToValueAtTime(0.2, p.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, p.time + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(p.time);
      osc.stop(p.time + 0.12);
    });
  } catch {
    // Non-fatal audio fallback
  }
}

/**
 * Play the designated sound for a given incident severity.
 * INFO: completely silent.
 * WARNING: gentle warning chime.
 * CRITICAL: emergency 3-pulse tone.
 */
export function playIncidentSound(severity: IncidentSeverity): void {
  if (severity === 'CRITICAL') {
    playCriticalEmergencyTone();
  } else if (severity === 'WARNING') {
    playWarningChime();
  }
}
