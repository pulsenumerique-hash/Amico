/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceState, AudioDiagnosticLog, TurnLatencyMetrics, MicSensitivityPreset } from '../types';

export interface VoiceControllerCallbacks {
  onStateChange: (state: VoiceState, message?: string) => void;
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string, latencyMetrics?: Partial<TurnLatencyMetrics>) => void;
  onVolumeChange: (volume: number) => void;
  onVoiceActivity?: (isActive: boolean, volume: number) => void;
  onAssistantSpeechStart: (text: string) => void;
  onAssistantSpeechEnd: () => void;
  onError: (errorText: string) => void;
  onDiagnosticLog?: (log: AudioDiagnosticLog) => void;
  onLatencyMetric?: (metrics: TurnLatencyMetrics) => void;
}

export interface VoiceConfig {
  voiceEngine: 'gemini_neural' | 'browser_voice';
  voiceGender: 'male' | 'female';
  voiceSpeed: number;
  browserVoiceUri?: string;
  silenceThresholdMs?: number;
  micSensitivityPreset?: MicSensitivityPreset;
  micInputGain?: number;
}

/**
 * Normalizes speech recognition output for Italian oral communication:
 * 1. Handles elisions (l'amico, l'ora, un'ora, d'accordo, c'è, qual è, anch'io, po')
 * 2. Cleans punctuation and whitespace
 * 3. Preserves learner hesitations (ehm, uhm, allora, cioè)
 */
export function normalizeItalianTranscript(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Fix elisions where Web Speech outputs spaces instead of apostrophe
  cleaned = cleaned
    // l' + vowel/h: l amico -> l'amico, l ora -> l'ora, l italiano -> l'italiano
    .replace(/\b([Ll])\s+([aeiouhàèéìòóù][a-zàèéìòóù]*)/gi, "$1'$2")
    // un' + feminine words starting with vowel (un ora -> un'ora, un idea -> un'idea, un altra -> un'altra)
    .replace(/\b([Uu]n)\s+(ora|amica|idea|altra|esperienza|emozione|estate|isola|epoca|occasione|abitudine|uscita|avventura|opinione|aula)\b/gi, "$1'$2")
    // d' + vowel: d accordo -> d'accordo, d oro -> d'oro, d altro -> d'altro, d epoca -> d'epoca
    .replace(/\b([Dd])\s+([aeiouhàèéìòóù][a-zàèéìòóù]*)/gi, "$1'$2")
    // c'è, c'era, c'erano: c e / c è -> c'è, c era -> c'era, c erano -> c'erano
    .replace(/\b([Cc])\s+([eè]|era|erano|entrasse|esce)\b/gi, "$1'$2")
    // qual è (always without apostrophe in standard Italian)
    .replace(/\bqual['\s]+[eè]\b/gi, 'qual è')
    // anch'io / anch'esso / anch'essa
    .replace(/\banch\s+(io|esso|essa|essi|esse)\b/gi, "anch'$1")
    // po' (un po)
    .replace(/\bun\s+po\b/gi, "un po'")
    // Clean multiple spaces
    .replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Seamless boundary stitcher between previously committed text and incoming transcript.
 * Avoids accidental duplication of words right at the boundary of a browser speech recognition restart.
 */
export function stitchTranscripts(previous: string, current: string): string {
  const prev = previous.trim();
  const curr = current.trim();
  if (!prev) return curr;
  if (!curr) return prev;

  const prevWords = prev.split(/\s+/);
  const currWords = curr.split(/\s+/);

  // Check 2-word boundary overlap (e.g. "andato a Roma" + "a Roma ieri")
  if (
    currWords.length >= 2 &&
    prevWords.length >= 2 &&
    prevWords[prevWords.length - 2].toLowerCase() === currWords[0].toLowerCase() &&
    prevWords[prevWords.length - 1].toLowerCase() === currWords[1].toLowerCase()
  ) {
    return prev + ' ' + currWords.slice(2).join(' ');
  }

  // Check 1-word boundary overlap (e.g. "vado a" + "a scuola")
  if (
    currWords.length >= 1 &&
    prevWords.length >= 1 &&
    prevWords[prevWords.length - 1].toLowerCase() === currWords[0].toLowerCase()
  ) {
    return prev + ' ' + currWords.slice(1).join(' ');
  }

  return prev + ' ' + curr;
}

/**
 * Evaluates candidate hypotheses from Web Speech API alternatives to select
 * the most authentic, natural Italian transcription.
 */
export function selectBestItalianAlternative(item: any): string {
  if (!item || item.length === 0) return '';
  if (item.length === 1) return item[0].transcript || '';

  let bestTranscript = item[0].transcript || '';
  let highestScore = (item[0].confidence ?? 0.5);

  // Key Italian linguistic indicators that reward valid Italian phrasing over phonetic artifacts
  const italianMarkers = /\b(ciao|sono|stato|giornata|molto|bene|anche|perché|allora|diciamo|andato|fare|fatto|voglio|posso|bello|bella|tempo|scuola|lavoro|amico|parlare|imparare|italiano|pizza|caffè|grazie|prego|sempre|quando|come|dove|cosa|tutto|tutti|poco|troppo|vero|davvero|adesso|ancora|piacere|giorno|sera|notte|casa|famiglia|studio|oggi|ieri|domani)\b/i;

  for (let a = 0; a < item.length; a++) {
    const alt = item[a];
    if (!alt || !alt.transcript) continue;
    let score = (alt.confidence ?? 0.5);
    if (italianMarkers.test(alt.transcript)) {
      score += 0.25; // boost authentic Italian vocabulary
    }
    if (score > highestScore) {
      highestScore = score;
      bestTranscript = alt.transcript;
    }
  }

  return bestTranscript;
}

export class VoiceSessionController {
  // Strict Centralized State Machine
  private state: VoiceState = 'IDLE';
  private callbacks: VoiceControllerCallbacks;
  private config: VoiceConfig;

  // Explicit User Intent Flag - ONLY true when user explicitly started session
  private isUserSessionExplicitlyActive = false;

  // Turn ID & Stale Response Prevention
  private currentTurnId = 0;

  // Speech Recognition Engine
  private recognition: any = null;
  private isRecognitionActive = false;
  private isRecognitionStarting = false;
  private restartTimeout: any = null;
  private silenceTimer: any = null;

  // Turn Cumulative Speech Buffers (100% preservation across thinking pauses and browser restarts)
  private turnCommittedText = '';
  private currentSessionFinalText = '';
  private currentSessionInterimText = '';
  private lastSpeechTimestamp = 0;

  // Audio Capture & High-Resolution VAD Analysis
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private lastVolumeSent = 0;
  private isVocalActivityOngoing = false;
  private lastVocalEnergyTimestamp = 0;

  // Audio Playback Elements
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private abortController: AbortController | null = null;
  private isMuted = false;

  // Latency Timestamps for Current Turn
  private currentTurnMetrics: Partial<TurnLatencyMetrics> = {};

  // Diagnostic Logs (keeps last 50 events)
  private diagnosticLogs: AudioDiagnosticLog[] = [];

  constructor(callbacks: VoiceControllerCallbacks, config: VoiceConfig) {
    this.callbacks = callbacks;
    this.config = {
      micSensitivityPreset: 'high',
      micInputGain: 1.4,
      ...config,
    };
    this.logDiagnostic('REC_START', 'Inizializzazione VoiceSessionController (Stato: IDLE)', 'inactive');
  }

  public updateCallbacks(callbacks: VoiceControllerCallbacks) {
    this.callbacks = callbacks;
  }

  public updateConfig(newConfig: Partial<VoiceConfig>) {
    const prevPreset = this.config.micSensitivityPreset;
    this.config = { ...this.config, ...newConfig };

    // Real-time software gain adjustment without audio graph reset
    if (this.gainNode && this.audioContext) {
      if (newConfig.micInputGain !== undefined) {
        this.gainNode.gain.setValueAtTime(newConfig.micInputGain, this.audioContext.currentTime);
        this.logDiagnostic('REC_START', `Guadagno microfono impostato a ${newConfig.micInputGain}x`);
      } else if (newConfig.micSensitivityPreset && newConfig.micSensitivityPreset !== prevPreset) {
        const autoGain =
          newConfig.micSensitivityPreset === 'high'
            ? 1.6
            : newConfig.micSensitivityPreset === 'noisy_env'
            ? 1.0
            : 1.3;
        this.gainNode.gain.setValueAtTime(autoGain, this.audioContext.currentTime);
        this.logDiagnostic(
          'REC_START',
          `Preset sensibilità impostato su: "${newConfig.micSensitivityPreset}" (Guadagno: ${autoGain}x)`
        );
      }
    }
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getCurrentTurnId(): number {
    return this.currentTurnId;
  }

  public isVoiceActive(): boolean {
    return this.isVocalActivityOngoing;
  }

  public getDiagnosticLogs(): AudioDiagnosticLog[] {
    return [...this.diagnosticLogs];
  }

  public getHardwareMicState(): 'live' | 'muted' | 'ended' | 'inactive' {
    if (!this.microphoneStream) return 'inactive';
    const tracks = this.microphoneStream.getAudioTracks();
    if (tracks.length === 0) return 'inactive';
    const track = tracks[0];
    if (track.readyState === 'ended') return 'ended';
    if (track.muted) return 'muted';
    return 'live';
  }

  public isRecognitionRunning(): boolean {
    return this.isRecognitionActive;
  }

  /**
   * Returns the entire cumulative transcript for the current user turn.
   * Completely preserves speech across pauses, breaths, and browser speech recognition restarts.
   * Performs seamless word-boundary stitching and Italian elision normalization.
   */
  public getCurrentTurnTranscript(): string {
    let combined = '';
    if (this.turnCommittedText.trim()) {
      combined = this.turnCommittedText.trim();
    }
    if (this.currentSessionFinalText.trim()) {
      combined = stitchTranscripts(combined, this.currentSessionFinalText.trim());
    }
    if (this.currentSessionInterimText.trim()) {
      combined = stitchTranscripts(combined, this.currentSessionInterimText.trim());
    }
    return normalizeItalianTranscript(combined);
  }

  /**
   * Resets all turn buffers cleanly
   */
  private clearTurnBuffers() {
    this.turnCommittedText = '';
    this.currentSessionFinalText = '';
    this.currentSessionInterimText = '';
    this.isVocalActivityOngoing = false;
    this.lastVocalEnergyTimestamp = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private logDiagnostic(
    type: AudioDiagnosticLog['type'],
    details: string,
    forcedTrackState?: string,
    latencyMs?: number
  ) {
    const timestamp = new Date().toLocaleTimeString('it-IT', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const trackState = forcedTrackState || this.getHardwareMicState();

    const log: AudioDiagnosticLog = {
      timestamp,
      type,
      state: this.state,
      details,
      trackState,
      latencyMs,
    };

    this.diagnosticLogs.unshift(log);
    if (this.diagnosticLogs.length > 50) {
      this.diagnosticLogs.pop();
    }

    console.log(`[Amico ${timestamp}] [${type}] [State: ${this.state}] [Mic: ${trackState}] ${details}`);

    if (this.callbacks.onDiagnosticLog) {
      this.callbacks.onDiagnosticLog(log);
    }
  }

  /**
   * Transition to a new State with Strict Mutual Exclusion
   */
  private transitionTo(newState: VoiceState, message?: string) {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    this.logDiagnostic(
      newState === 'ERROR' ? 'REC_ERROR' : 'REC_START',
      `Transizione stato: ${oldState} -> ${newState}. ${message || ''}`
    );

    // Rule: Strict state invariants
    switch (newState) {
      case 'IDLE':
        this.stopRecognition();
        this.stopAudioPlayback();
        break;

      case 'LISTENING':
        // Exclusive listening: audio playback must be stopped before listening starts!
        this.stopAudioPlayback();
        this.clearTurnBuffers();
        if (this.recognition && !this.isRecognitionActive && !this.isMuted) {
          this.startRecognitionSafe();
        }
        break;

      case 'PROCESSING':
        // Exclusive processing: speech recognition is stopped while AI is working
        this.stopRecognition();
        this.stopAudioPlayback();
        break;

      case 'SPEAKING':
        // Exclusive speaking: recognition is completely OFF to prevent self-listening!
        this.stopRecognition();
        break;

      case 'INTERRUPTING':
        // Abrupt stop of playback and in-flight operations
        this.cancelPendingActions();
        break;

      case 'ERROR':
        this.stopRecognition();
        this.stopAudioPlayback();
        break;
    }

    this.callbacks.onStateChange(newState, message);
  }

  /**
   * Start a continuous voice session
   */
  public async startSession(): Promise<boolean> {
    this.isUserSessionExplicitlyActive = true;
    this.currentTurnId++;
    this.logDiagnostic('USER_START', `Avvio sessione vocale (Turno #${this.currentTurnId})`);

    try {
      this.transitionTo('LISTENING', 'Connessione al microfono...');

      // 1. Initialize microphone hardware
      await this.initMicrophone();

      // 2. Initialize Speech Recognition
      this.initRecognition();
      this.startRecognitionSafe();

      this.transitionTo('LISTENING', 'Ti ascolto: parla pure in italiano...');
      return true;
    } catch (err: any) {
      console.log('[Amico Voice] Inizializzazione sessione non riuscita:', err?.message || 'Permesso microfono non concesso');
      this.isUserSessionExplicitlyActive = false;
      this.transitionTo('ERROR', err?.message || 'Accesso al microfono negato.');
      this.callbacks.onError('Assicurati di aver concesso il permesso per il microfono nel browser.');
      return false;
    }
  }

  /**
   * Stop session completely upon user request
   */
  public stopSession() {
    this.isUserSessionExplicitlyActive = false;
    this.currentTurnId++;
    this.logDiagnostic('USER_STOP', 'Sessione terminata volontariamente dall’utente');

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.clearTurnBuffers();
    this.cancelPendingActions();
    this.stopRecognition();
    this.stopMicrophone();
    this.transitionTo('IDLE', 'Sessione terminata.');
  }

  /**
   * Toggle mute
   */
  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.logDiagnostic('USER_START', `Mute impostato su: ${muted}`);

    if (muted) {
      this.stopRecognition();
    } else if (this.isUserSessionExplicitlyActive && this.state === 'LISTENING') {
      this.startRecognitionSafe();
    }
  }

  /**
   * Immediate Barge-in / Interruption of Amico's speech
   */
  public interrupt() {
    if (this.state === 'SPEAKING' || this.state === 'PROCESSING') {
      this.logDiagnostic('REC_SPEECH_START', `Interruzione manuale del turno #${this.currentTurnId}`);
      this.currentTurnId++; // Invalidate stale audio callbacks

      this.transitionTo('INTERRUPTING', 'Interruzione in corso...');
      this.cancelPendingActions();

      // Return cleanly to LISTENING after stopping audio
      setTimeout(() => {
        if (this.isUserSessionExplicitlyActive) {
          this.transitionTo('LISTENING', 'Ti ascolto: parla pure...');
        }
      }, 150);
    }
  }

  private stopAudioPlayback() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  private cancelPendingActions() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.stopAudioPlayback();
    this.callbacks.onAssistantSpeechEnd();
  }

  /**
   * Hardware Audio Stream initialization with High-Sensitivity Acoustic Controls
   */
  private async initMicrophone() {
    if (this.microphoneStream) {
      const tracks = this.microphoneStream.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        this.logDiagnostic('TRACK_START', 'Stream microfonico hardware già aperto');
        return;
      }
    }

    const preset = this.config.micSensitivityPreset || 'high';
    this.logDiagnostic(
      'TRACK_START',
      `Richiesta microfono con profilo: "${preset}" (Alta sensibilità per voce dolce/sussurrata)`
    );

    // Dynamic constraints based on acoustic profile
    // High sensitivity relaxes aggressive noiseSuppression so quiet voice onsets, soft vowels,
    // and subtle Italian double consonants are never clipped or muffled by the browser!
    const preferredConstraints: MediaTrackConstraints =
      preset === 'high'
        ? {
            echoCancellation: true,
            noiseSuppression: false, // Critical: preserves soft Italian phonemes
            autoGainControl: true,
            channelCount: 1,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: preferredConstraints });
    } catch (err: any) {
      console.warn('[Amico] Vincoli audio avanzati rifiutati, tentativo con fallback base:', err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, autoGainControl: true },
        });
      } catch (fallbackErr: any) {
        // Ultimate fallback
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    }

    this.microphoneStream = stream;
    const tracks = stream.getAudioTracks();
    if (tracks.length > 0) {
      const track = tracks[0];
      const settings = track.getSettings ? track.getSettings() : {};
      this.logDiagnostic(
        'TRACK_START',
        `Microfono agganciato: "${track.label || 'Default'}" (AEC=${settings.echoCancellation ?? 'attivo'}, NS=${settings.noiseSuppression ?? 'regolato'}, AGC=${settings.autoGainControl ?? 'attivo'}, freq=${settings.sampleRate || 44100}Hz)`
      );

      track.onended = () => {
        this.logDiagnostic('TRACK_STOP', 'Microfono hardware disconnesso!');
        if (this.isUserSessionExplicitlyActive) {
          this.transitionTo('ERROR', 'Il microfono è stato disconnesso.');
        }
      };
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      try {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(stream);

        // Hardware / Software Amplification Gain Node
        this.gainNode = this.audioContext.createGain();
        const baseGain =
          this.config.micInputGain ??
          (preset === 'high' ? 1.6 : preset === 'noisy_env' ? 1.0 : 1.3);
        this.gainNode.gain.setValueAtTime(baseGain, this.audioContext.currentTime);

        // High-resolution Analyser Node for nuanced speech detection
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.35;

        source.connect(this.gainNode);
        this.gainNode.connect(this.analyser);

        this.startVolumeMonitoring();
      } catch (audioCtxErr) {
        console.warn('Inizializzazione AudioContext non riuscita:', audioCtxErr);
      }
    }
  }

  private startVolumeMonitoring() {
    if (!this.analyser) return;
    const timeData = new Uint8Array(this.analyser.fftSize);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);

    const preset = this.config.micSensitivityPreset || 'high';
    const speechThreshold = preset === 'high' ? 5 : preset === 'noisy_env' ? 14 : 9;

    const updateVolume = () => {
      if (!this.analyser || !this.microphoneStream) return;

      // 1. RMS Acoustic Energy Calculation (Time domain)
      this.analyser.getByteTimeDomainData(timeData);
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);

      // 2. Frequency Energy in Human Vocal Band (120 Hz to 3500 Hz)
      this.analyser.getByteFrequencyData(freqData);
      const sampleRate = this.audioContext?.sampleRate || 44100;
      const binWidth = sampleRate / this.analyser.fftSize;
      let vocalEnergy = 0;
      let vocalBinCount = 0;

      for (let i = 0; i < freqData.length; i++) {
        const freq = i * binWidth;
        if (freq >= 120 && freq <= 3500) {
          vocalEnergy += freqData[i];
          vocalBinCount++;
        }
      }
      const vocalAvg = vocalBinCount > 0 ? vocalEnergy / vocalBinCount : 0;

      // 3. Sensitive Perceptual Curve (Captures whispers, soft onsets and gentle Italian vowels)
      const speechScore = Math.max(rms * 130, vocalAvg / 1.4);
      const normalized = Math.min(100, Math.round(Math.pow(speechScore / 100, 0.72) * 100));

      // Voice Activity Detection (strictly guarded so Amico's speech never triggers user voice activity)
      const isVoiceNow =
        this.state === 'LISTENING' &&
        (normalized >= speechThreshold || vocalAvg >= 7 || rms >= 0.006);
      const now = performance.now();

      if (isVoiceNow) {
        this.isVocalActivityOngoing = true;
        this.lastVocalEnergyTimestamp = now;
      } else if (now - this.lastVocalEnergyTimestamp > 500) {
        this.isVocalActivityOngoing = false;
      }

      // Send volume updates smoothly
      if (Math.abs(normalized - this.lastVolumeSent) >= 2 || (normalized === 0 && this.lastVolumeSent > 0)) {
        this.lastVolumeSent = normalized;
        this.callbacks.onVolumeChange(normalized);
        if (this.callbacks.onVoiceActivity) {
          this.callbacks.onVoiceActivity(this.isVocalActivityOngoing, normalized);
        }
      }

      this.animFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  private stopMicrophone() {
    this.logDiagnostic('TRACK_STOP', 'Rilascio e chiusura microfono hardware');

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((t) => t.stop());
      this.microphoneStream = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.lastVolumeSent = 0;
    this.isVocalActivityOngoing = false;
    this.callbacks.onVolumeChange(0);
    if (this.callbacks.onVoiceActivity) {
      this.callbacks.onVoiceActivity(false, 0);
    }
  }

  /**
   * Initializes SpeechRecognition with Anti-Self-Listening guards and Italian Voice Optimization
   */
  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.logDiagnostic('REC_ERROR', 'Web Speech API non supportata nel browser');
      this.callbacks.onError('Riconoscimento vocale non supportato nel browser.');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'it-IT';
    rec.maxAlternatives = 3; // Evaluates top Italian hypotheses

    rec.onstart = () => {
      this.isRecognitionStarting = false;
      this.isRecognitionActive = true;
      this.logDiagnostic('REC_START', 'SpeechRecognition attiva in ascolto utente (it-IT, maxAlt=3)');
    };

    rec.onspeechstart = () => {
      // User began speaking
      if (!this.currentTurnMetrics.userSpeechEnd) {
        this.currentTurnMetrics.turnId = this.currentTurnId;
      }
      this.logDiagnostic('REC_SPEECH_START', 'Inizio voce utente rilevato');
    };

    rec.onspeechend = () => {
      this.currentTurnMetrics.userSpeechEnd = performance.now();
      this.logDiagnostic('REC_SPEECH_END', 'Fine emissione vocale utente');
    };

    rec.onresult = (event: any) => {
      // Discard if not in LISTENING state or muted
      if (this.state !== 'LISTENING' || this.isMuted) {
        if (this.state !== 'LISTENING') {
          this.logDiagnostic(
            'REC_RESULT',
            `Trascrizione scartata: stato attuale="${this.state}" (non LISTENING)`
          );
        }
        return;
      }

      let finalAcc = '';
      let interimAcc = '';

      // In continuous mode, event.results holds all segments for this recognition cycle
      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        const bestText = selectBestItalianAlternative(item);
        if (item.isFinal) {
          finalAcc = stitchTranscripts(finalAcc, bestText);
        } else {
          interimAcc = stitchTranscripts(interimAcc, bestText);
        }
      }

      this.currentSessionFinalText = normalizeItalianTranscript(finalAcc);
      this.currentSessionInterimText = normalizeItalianTranscript(interimAcc);

      const now = performance.now();
      this.lastSpeechTimestamp = now;
      this.currentTurnMetrics.userSpeechEnd = now;

      // Extract the complete cumulative transcript of the turn (committed + session final + session interim)
      const fullText = this.getCurrentTurnTranscript();

      if (fullText.length > 0) {
        // Pass the COMPLETE accumulated message to the UI
        this.callbacks.onInterimTranscript(fullText);

        this.logDiagnostic(
          'REC_RESULT',
          `Trascrizione utente integrale: "${fullText}" (isFinalChunk=${!interimAcc && !!finalAcc})`
        );

        // Schedule adaptive silence timer on the full accumulated text
        this.scheduleAdaptiveSilenceTimer(fullText, !interimAcc && !!finalAcc);
      }
    };

    rec.onerror = (event: any) => {
      const errorName = event.error;

      if (errorName === 'no-speech') {
        // Benign: normal silence while waiting for user to speak
        this.logDiagnostic('REC_ERROR', 'Silenzio (no-speech) - sessione LISTENING mantenuta');
        return;
      }

      if (errorName === 'aborted') {
        this.logDiagnostic('REC_ERROR', 'SpeechRecognition abortita');
        return;
      }

      if (errorName === 'network') {
        this.logDiagnostic('REC_ERROR', 'Errore di rete temporaneo su SpeechRecognition');
        return;
      }

      if (errorName === 'not-allowed') {
        this.isUserSessionExplicitlyActive = false;
        this.transitionTo('ERROR', 'Permesso microfono negato.');
        this.callbacks.onError('Permesso microfono non concesso.');
        return;
      }

      this.logDiagnostic('REC_ERROR', `SpeechRecognition errore: ${errorName}`);
    };

    rec.onend = () => {
      this.isRecognitionActive = false;
      this.isRecognitionStarting = false;
      this.logDiagnostic(
        'REC_END',
        `SpeechRecognition terminato dal browser. Stato: ${this.state}, Sessione attiva: ${this.isUserSessionExplicitlyActive}`
      );

      // CRITICAL PAUSE SAFETY & CONTEXT PRESERVATION:
      // When the browser stops speech recognition during a thinking pause:
      // We safely commit whatever text was recognized in this session into turnCommittedText!
      // This guarantees that when recognition restarts, NOT A SINGLE WORD IS LOST!
      const uncommitted = (this.currentSessionFinalText + ' ' + this.currentSessionInterimText)
        .replace(/\s+/g, ' ')
        .trim();

      if (uncommitted) {
        this.turnCommittedText = stitchTranscripts(
          this.turnCommittedText,
          normalizeItalianTranscript(uncommitted)
        );
        this.currentSessionFinalText = '';
        this.currentSessionInterimText = '';
      }

      // Transparent, ultra-fast auto-restart (within 40ms) ONLY if in LISTENING and session is active
      if (this.isUserSessionExplicitlyActive && this.state === 'LISTENING' && !this.isMuted) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (
            this.isUserSessionExplicitlyActive &&
            this.state === 'LISTENING' &&
            !this.isRecognitionActive
          ) {
            this.logDiagnostic(
              'RESTART_ATTEMPT',
              `Riavvio trasparente SpeechRecognition (mantenuti ${this.turnCommittedText.length} car.)`
            );
            this.startRecognitionSafe();
          }
        }, 40);
      }
    };

    this.recognition = rec;
  }

  private startRecognitionSafe() {
    if (this.state !== 'LISTENING' || !this.isUserSessionExplicitlyActive) return;
    if (this.isRecognitionActive || this.isRecognitionStarting) return;

    if (!this.recognition) {
      this.initRecognition();
    }

    try {
      this.isRecognitionStarting = true;
      this.recognition.start();
    } catch (err: any) {
      this.isRecognitionStarting = false;
      this.logDiagnostic('REC_ERROR', `rec.start() exception: ${err?.message || err}`);

      // Re-create the recognition instance to break out of any internal browser lock
      try {
        if (this.recognition) {
          this.recognition.abort();
        }
      } catch (e) {}
      this.initRecognition();

      if (this.isUserSessionExplicitlyActive && this.state === 'LISTENING') {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isUserSessionExplicitlyActive && this.state === 'LISTENING' && !this.isRecognitionActive) {
            this.startRecognitionSafe();
          }
        }, 150);
      }
    }
  }

  private stopRecognition() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        // Immediate cancellation frees up audio resources synchronously
        this.recognition.abort();
      } catch (e) {}
      this.isRecognitionActive = false;
      this.isRecognitionStarting = false;
    }
  }

  /**
   * Adaptive Silence Timer for Natural Spoken Italian
   * Allows thinking pauses of 3+ seconds while preserving the entire sentence.
   * Leverages VAD activity to avoid prematurely cutting off soft speech or breathing.
   */
  private scheduleAdaptiveSilenceTimer(fullText: string, isDefinitiveSentence: boolean) {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    const trimmed = fullText.trim();
    if (!trimmed) return;

    // Detect hesitation markers or unfinished clauses at the end of the text
    // Italian connectors: e, ed, ma, però, perché, quindi, o, oppure, cioè, come, tipo, allora, diciamo, beh, mah, uhm, ehm, ah, un, una, uno, il, la, lo, i, gli, le, di, a, da, in, con, su, per, tra, fra, che, se, non, anche...
    const isHesitating = /\b(e|ed|ma|per[oò]|perch[eé]|quindi|o|oppure|cio[eè]|come|tipo|allora|diciamo|beh|mah|uhm|ehm|ah|ecco|un|una|uno|il|la|lo|i|gli|le|di|a|da|in|con|su|per|tra|fra|che|se|non|anche)\s*$/i.test(
      trimmed
    );

    const baseSilence = this.config.silenceThresholdMs || 3000;

    let delayMs = baseSilence;

    if (isHesitating) {
      // User paused on a connector or hesitation word (searching for words): give generous room!
      delayMs = Math.max(baseSilence + 1400, 4400);
    } else if (isDefinitiveSentence && /[.?!]$/.test(trimmed) && trimmed.split(/\s+/).length >= 4) {
      // Complete sentence ending with punctuation (. ? !) and substantial words
      delayMs = Math.max(2200, baseSilence - 400);
    }

    this.silenceTimer = setTimeout(() => {
      // VAD Guard: If the user is actively vocalizing (whispering, humming, thinking aloud),
      // DO NOT finalize the turn yet! Extend gently.
      if (this.isVocalActivityOngoing) {
        this.logDiagnostic(
          'REC_SPEECH_START',
          'Attività vocale dolce ancora presente al termine del timer: prolungamento pausa per lo studente'
        );
        this.silenceTimer = setTimeout(() => {
          this.finalizeUserTurn();
        }, 1200);
        return;
      }

      this.finalizeUserTurn();
    }, delayMs);
  }

  private finalizeUserTurn() {
    const fullTextToSend = this.getCurrentTurnTranscript();

    // Guard: Only process if there is actual transcribed content and we are in LISTENING state
    if (fullTextToSend.length > 0 && this.state === 'LISTENING') {
      const now = performance.now();
      this.currentTurnMetrics.finalTranscriptReceived = now;
      this.currentTurnMetrics.aiProcessingStart = now;

      this.logDiagnostic(
        'SILENCE_TRIGGER',
        `Fine turno utente confermata. Testo integrale (${fullTextToSend.length} car.): "${fullTextToSend}"`
      );

      // Clean turn buffers now that text has been captured
      this.clearTurnBuffers();
      this.callbacks.onInterimTranscript('');

      // Transition strictly to PROCESSING: mic is immediately shut off!
      this.transitionTo('PROCESSING', 'Elaborazione risposta con intelligenza artificiale...');

      // Notify consumer with complete unbroken message
      this.callbacks.onFinalTranscript(fullTextToSend, { ...this.currentTurnMetrics });
    }
  }

  /**
   * Immediate user submission (e.g. "Invia subito" button)
   */
  public forceFinalizeTurn() {
    if (this.state === 'LISTENING') {
      const currentText = this.getCurrentTurnTranscript();
      if (currentText.length > 0) {
        this.logDiagnostic('USER_START', `Invio immediato forzato dall'utente: "${currentText}"`);
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        this.finalizeUserTurn();
      }
    }
  }

  /**
   * Resumes or starts listening state
   */
  public startListening() {
    this.clearTurnBuffers();
    this.transitionTo('LISTENING', 'Ti ascolto: parla pure in italiano...');
  }

  /**
   * Pronounce response exclusively in SPEAKING state
   */
  public async speak(
    text: string,
    options?: {
      voiceEngine?: 'gemini_neural' | 'browser_voice';
      voiceGender?: 'male' | 'female';
      ttsAudioBase64?: string;
      turnId?: number;
    }
  ): Promise<void> {
    const turnId = options?.turnId ?? this.currentTurnId;

    // Transition strictly to SPEAKING: SpeechRecognition is shut down!
    this.transitionTo('SPEAKING', 'Amico sta parlando...');
    this.callbacks.onAssistantSpeechStart(text);

    const playbackStartTime = performance.now();
    this.currentTurnMetrics.audioPlaybackStart = playbackStartTime;

    if (this.currentTurnMetrics.userSpeechEnd) {
      const totalLatency = Math.round(playbackStartTime - this.currentTurnMetrics.userSpeechEnd);
      this.currentTurnMetrics.totalLatencyMs = totalLatency;
      this.logDiagnostic(
        'LATENCY_METRIC',
        `Latenza totale turno #${turnId}: ${totalLatency}ms (Fine parola utente -> Inizio audio Amico)`,
        undefined,
        totalLatency
      );

      if (this.callbacks.onLatencyMetric) {
        this.callbacks.onLatencyMetric(this.currentTurnMetrics as TurnLatencyMetrics);
      }
    }

    const engine = options?.voiceEngine || this.config.voiceEngine;
    const gender = options?.voiceGender || this.config.voiceGender;

    // 1. If audio base64 is already supplied (e.g. from single-roundtrip /api/chat)
    if (options?.ttsAudioBase64) {
      await this.playBase64Audio(options.ttsAudioBase64, turnId);
      this.onPlaybackConcluded(turnId);
      return;
    }

    // 2. If Neural voice selected but audio needs fetch
    if (engine === 'gemini_neural') {
      try {
        this.abortController = new AbortController();
        const ttsStart = performance.now();
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceGender: gender }),
          signal: this.abortController.signal,
        });
        const data = await res.json();
        const ttsDuration = Math.round(performance.now() - ttsStart);
        this.currentTurnMetrics.ttsDurationMs = ttsDuration;

        if (data && data.audioBase64 && turnId === this.currentTurnId) {
          await this.playBase64Audio(data.audioBase64, turnId);
          this.onPlaybackConcluded(turnId);
          return;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Fallback a sintesi vocale browser:', err?.message);
      }
    }

    // 3. Fast Zero-Latency Browser Web Speech Voice
    await this.playBrowserSpeech(text, turnId);
    this.onPlaybackConcluded(turnId);
  }

  private playBase64Audio(base64: string, turnId: number): Promise<void> {
    return new Promise((resolve) => {
      if (turnId !== this.currentTurnId) {
        resolve();
        return;
      }

      let isFinished = false;
      let watchdogTimer: any = null;

      const finishPlayback = () => {
        if (isFinished) return;
        isFinished = true;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        this.currentAudioElement = null;
        resolve();
      };

      try {
        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        this.currentAudioElement = audio;
        audio.playbackRate = this.config.voiceSpeed || 1.0;

        // Watchdog to guarantee playback never permanently deadlocks
        const maxDurationMs = Math.max(8000, Math.round((base64.length / 28000) * 1000) + 4000);
        watchdogTimer = setTimeout(() => {
          this.logDiagnostic('AUDIO_PLAY_END', `Watchdog riproduzione WAV scattato (${maxDurationMs}ms)`);
          finishPlayback();
        }, maxDurationMs);

        audio.onplay = () => {
          this.logDiagnostic('AUDIO_PLAY_START', `Inizio riproduzione audio WAV (Turno #${turnId})`);
        };

        audio.onended = () => {
          this.logDiagnostic('AUDIO_PLAY_END', `Fine riproduzione audio WAV (Turno #${turnId})`);
          finishPlayback();
        };

        audio.onerror = (e) => {
          console.warn('WAV audio playback error:', e);
          finishPlayback();
        };

        audio.play().catch((err) => {
          console.warn('Audio play rejected:', err);
          finishPlayback();
        });
      } catch (e) {
        finishPlayback();
      }
    });
  }

  private playBrowserSpeech(text: string, turnId: number): Promise<void> {
    return new Promise((resolve) => {
      if (turnId !== this.currentTurnId) {
        resolve();
        return;
      }

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      let isFinished = false;
      let resumeInterval: any = null;
      let watchdogTimer: any = null;

      const finishSpeech = () => {
        if (isFinished) return;
        isFinished = true;
        if (resumeInterval) clearInterval(resumeInterval);
        if (watchdogTimer) clearTimeout(watchdogTimer);
        this.currentUtterance = null;
        resolve();
      };

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        utterance.lang = 'it-IT';
        utterance.rate = this.config.voiceSpeed || 1.0;
        utterance.pitch = this.config.voiceGender === 'male' ? 0.95 : 1.05;

        const voices = window.speechSynthesis.getVoices();
        const italianVoices = voices.filter((v) => v.lang.startsWith('it') || v.lang.includes('IT'));

        if (this.config.browserVoiceUri) {
          const matching = italianVoices.find((v) => v.voiceURI === this.config.browserVoiceUri);
          if (matching) utterance.voice = matching;
        } else if (italianVoices.length > 0) {
          const preferred =
            italianVoices.find(
              (v) =>
                v.name.toLowerCase().includes('google') ||
                v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('alice') ||
                v.name.toLowerCase().includes('cosimo')
            ) || italianVoices[0];
          utterance.voice = preferred;
        }

        // Chromium speech synthesis bug workaround: keep resume pulsing
        resumeInterval = setInterval(() => {
          if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          }
        }, 2500);

        // Safety watchdog based on sentence length
        const safeTimeoutMs = Math.max(5000, text.length * 110 + 3500);
        watchdogTimer = setTimeout(() => {
          this.logDiagnostic('AUDIO_PLAY_END', `Watchdog SpeechSynthesis scattato (${safeTimeoutMs}ms)`);
          finishSpeech();
        }, safeTimeoutMs);

        utterance.onstart = () => {
          this.logDiagnostic('AUDIO_PLAY_START', `Inizio SpeechSynthesis (Turno #${turnId})`);
        };

        utterance.onend = () => {
          this.logDiagnostic('AUDIO_PLAY_END', `Fine SpeechSynthesis (Turno #${turnId})`);
          finishSpeech();
        };

        utterance.onerror = () => {
          finishSpeech();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        finishSpeech();
      }
    });
  }

  /**
   * Only called when audio has physically finished playing
   */
  private onPlaybackConcluded(turnId: number) {
    // Drop event if interrupted or if turn has changed
    if (turnId !== this.currentTurnId) {
      this.logDiagnostic(
        'AUDIO_PLAY_END',
        `Fine audio scartata perché non corrisponde al turno attivo (finito #${turnId}, attuale #${this.currentTurnId})`
      );
      return;
    }

    this.currentTurnMetrics.audioPlaybackEnd = performance.now();
    this.callbacks.onAssistantSpeechEnd();

    // Transition cleanly from SPEAKING to LISTENING
    if (this.isUserSessionExplicitlyActive && this.state === 'SPEAKING') {
      this.transitionTo('LISTENING', 'Ti ascolto: parla pure in italiano...');
    } else if (!this.isUserSessionExplicitlyActive) {
      this.transitionTo('IDLE', 'Sessione terminata.');
    }
  }
}
