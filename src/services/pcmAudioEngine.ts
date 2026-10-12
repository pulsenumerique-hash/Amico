/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Robust PCM Audio Engine for Amico:
 * - 16 kHz 16-bit linear PCM microphone capture (resampled cleanly for cross-browser iOS/Android/Chrome compatibility)
 * - 24 kHz sample-accurate queued audio playback (no gaps, no overlaps, plays ALL chunks)
 * - User gesture unlocking (AudioContext.resume() on "Commencer" click)
 * - Barge-in voice activity detection (VAD) for instant interruption
 */

export interface PcmEngineCallbacks {
  onVolumeChange: (volumePercent: number) => void;
  onVoiceActivity: (isActive: boolean) => void;
  onPcmChunk?: (chunk: Int16Array, base64: string) => void;
  onBargeIn?: () => void;
  onPlaybackStarted?: () => void;
  onPlaybackEnded?: () => void;
  onError: (errorMessage: string, isPermissionError: boolean) => void;
}

/**
 * Resamples Float32 audio buffer from inputSampleRate down to targetSampleRate (e.g. 48000/44100 -> 16000)
 */
export function downsampleFloat32Buffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number = 16000
): Float32Array {
  if (inputSampleRate === outputSampleRate || buffer.length === 0) {
    return buffer;
  }
  if (inputSampleRate < outputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let sum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? sum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Converts Float32Array to 16-bit linear PCM Int16Array
 */
export function convertFloat32ToInt16PCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Encodes Int16Array PCM buffer to Base64 string
 */
export function int16ArrayToBase64(int16Array: Int16Array): string {
  const uint8 = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Decodes Base64 string to Uint8Array safely
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:audio\/[^;]+;base64,/, '');
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts raw PCM 16-bit (or WAV) bytes to an AudioBuffer at 24000 Hz
 */
export function pcmBytesToAudioBuffer(
  bytes: Uint8Array,
  audioCtx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  // Check for RIFF WAV header (starts with 'RIFF' 0x52 0x49 0x46 0x46)
  let pcmOffset = 0;
  let detectedRate = sampleRate;

  if (
    bytes.length >= 44 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    // Read sample rate from WAV header (offset 24, 4 bytes little-endian)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    detectedRate = view.getUint32(24, true) || sampleRate;

    // Scan chunks to locate 'data' subchunk (standard WAV usually puts it at 44, but may have metadata)
    for (let i = 12; i < bytes.length - 8; i++) {
      if (
        bytes[i] === 0x64 && // 'd'
        bytes[i + 1] === 0x61 && // 'a'
        bytes[i + 2] === 0x74 && // 't'
        bytes[i + 3] === 0x61 // 'a'
      ) {
        pcmOffset = i + 8;
        break;
      }
    }
    if (pcmOffset === 0) pcmOffset = 44;
  }

  const pcmBytes = bytes.subarray(pcmOffset);
  const sampleCount = Math.floor(pcmBytes.length / 2);
  const buffer = audioCtx.createBuffer(1, sampleCount, detectedRate);
  const channelData = buffer.getChannelData(0);
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = view.getInt16(i * 2, true);
    channelData[i] = int16 / (int16 < 0 ? 32768 : 32767);
  }

  return buffer;
}

/**
 * Sample-accurate Queue Player:
 * - Plays ALL audio chunks received (never just the first one)
 * - Timeline-scheduled: startTime = Math.max(now, nextStartTime)
 * - 0 gap, 0 overlap
 * - Instant interruption support
 */
export class AudioStreamQueuePlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;
  private pendingCount = 0;
  private targetSampleRate = 24000;
  private onQueueFinished?: () => void;
  private onPlaybackStart?: () => void;

  constructor(
    sampleRate = 24000,
    callbacks?: { onQueueFinished?: () => void; onPlaybackStart?: () => void }
  ) {
    this.targetSampleRate = sampleRate;
    this.onQueueFinished = callbacks?.onQueueFinished;
    this.onPlaybackStart = callbacks?.onPlaybackStart;
  }

  public getContext(): AudioContext | null {
    return this.audioCtx;
  }

  /**
   * Initializes or unlocks AudioContext strictly on user gesture (click/touch)
   */
  public async unlockOnUserGesture(): Promise<AudioContext> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContextClass({ sampleRate: this.targetSampleRate });
      } catch (e) {
        // Fallback for browsers with strict sample rate bounds
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Play a tiny silent buffer to warm up the iOS Safari WebKit audio pipeline
    try {
      const silentBuffer = this.audioCtx.createBuffer(1, 1, this.audioCtx.sampleRate);
      const source = this.audioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioCtx.destination);
      source.start(0);
    } catch (e) {}

    return this.audioCtx;
  }

  /**
   * Enqueues and schedules a base64 audio chunk (WAV or 24kHz PCM)
   */
  public async enqueueChunk(base64Data: string): Promise<void> {
    if (!base64Data) return;

    if (!this.audioCtx) {
      await this.unlockOnUserGesture();
    } else if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (!this.audioCtx) return;

    try {
      const bytes = base64ToUint8Array(base64Data);
      let audioBuffer: AudioBuffer;

      // Try browser native decodeAudioData first
      try {
        const arrayBuf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        audioBuffer = await this.audioCtx.decodeAudioData(arrayBuf);
      } catch (decodeErr) {
        // Fallback: parse raw 16-bit linear PCM
        audioBuffer = pcmBytesToAudioBuffer(bytes, this.audioCtx, this.targetSampleRate);
      }

      this.scheduleAudioBuffer(audioBuffer);
    } catch (err) {
      console.warn('[Amico AudioQueue] Erreur de décodage du morceau audio:', err);
    }
  }

  /**
   * Schedules multiple audio chunks seamlessly in sequence
   */
  public async enqueueMultipleChunks(chunks: string[]): Promise<void> {
    for (const chunk of chunks) {
      await this.enqueueChunk(chunk);
    }
  }

  /**
   * Schedules an AudioBuffer on the Web Audio timeline
   */
  private scheduleAudioBuffer(audioBuffer: AudioBuffer) {
    if (!this.audioCtx) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);

    const currentTime = this.audioCtx.currentTime;
    // Strict timeline scheduling: no overlap, no silence gap
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);

    this.nextStartTime = startTime + audioBuffer.duration;
    this.activeSources.add(source);
    this.pendingCount++;

    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.onPlaybackStart) this.onPlaybackStart();
    }

    source.onended = () => {
      this.activeSources.delete(source);
      this.pendingCount--;

      // If all scheduled buffers have finished and queue is clear
      if (this.activeSources.size === 0 && this.pendingCount <= 0) {
        this.isPlaying = false;
        this.nextStartTime = 0;
        if (this.onQueueFinished) {
          this.onQueueFinished();
        }
      }
    };
  }

  /**
   * Checks if audio is currently playing or scheduled
   */
  public isCurrentlyPlaying(): boolean {
    return this.isPlaying || this.activeSources.size > 0;
  }

  /**
   * Immediately stops all active and scheduled audio chunks (Interruption / Barge-in)
   */
  public stopAll(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    }
    this.activeSources.clear();
    this.pendingCount = 0;
    this.nextStartTime = 0;
    this.isPlaying = false;
  }
}

/**
 * Microphone Capture in 16 kHz 16-bit linear PCM:
 * - Cross-browser downsampling from native hardware rate
 * - VAD analysis for Barge-in detection
 */
export class PcmMicrophoneCapture {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private callbacks: PcmEngineCallbacks;

  private isCapturing = false;
  private isSpeakingMonitoring = false;
  private consecutiveLoudFrames = 0;

  constructor(callbacks: PcmEngineCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Informs the capture engine of AI speaking state for Barge-in detection
   */
  public setAiSpeaking(speaking: boolean) {
    this.isSpeakingMonitoring = speaking;
    if (!speaking) {
      this.consecutiveLoudFrames = 0;
    }
  }

  /**
   * Starts capture: Must be called from or chained to a user gesture (e.g. "Commencer" button)
   */
  public async start(): Promise<boolean> {
    if (this.isCapturing) return true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Request microphone with echo cancellation and auto gain
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Prevents clipping soft Italian phonemes
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);

      // ScriptProcessor with 4096 buffer size (~92ms buffer at 44.1kHz)
      this.scriptProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);

      const inputSampleRate = this.audioCtx.sampleRate;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isCapturing) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // 1. Calculate RMS energy for VAD & VU-meter
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          const sample = inputChannelData[i];
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);
        const volumePercent = Math.min(100, Math.round(rms * 100 * 4.8));

        this.callbacks.onVolumeChange(volumePercent);
        const isVoiceActive = volumePercent >= 7 || rms >= 0.015;
        this.callbacks.onVoiceActivity(isVoiceActive);

        // 2. Barge-in detection: If AI is currently speaking and user speaks loud enough
        if (this.isSpeakingMonitoring) {
          if (volumePercent >= 16 || rms >= 0.035) {
            this.consecutiveLoudFrames++;
            // If sustained for ~180ms (2 consecutive frames)
            if (this.consecutiveLoudFrames >= 2) {
              this.consecutiveLoudFrames = 0;
              if (this.callbacks.onBargeIn) {
                this.callbacks.onBargeIn();
              }
            }
          } else {
            this.consecutiveLoudFrames = 0;
          }
        }

        // 3. Downsample to 16 kHz & Convert to 16-bit linear PCM
        const downsampled = downsampleFloat32Buffer(inputChannelData, inputSampleRate, 16000);
        const pcm16 = convertFloat32ToInt16PCM(downsampled);

        if (this.callbacks.onPcmChunk) {
          const base64 = int16ArrayToBase64(pcm16);
          this.callbacks.onPcmChunk(pcm16, base64);
        }
      };

      this.sourceNode.connect(this.scriptProcessor);
      // Connect to destination via silent gain or dummy node to ensure onaudioprocess pulses in all browsers
      const dummyGain = this.audioCtx.createGain();
      dummyGain.gain.value = 0; // Completely muted so mic is not echoed back to speakers!
      this.scriptProcessor.connect(dummyGain);
      dummyGain.connect(this.audioCtx.destination);

      this.isCapturing = true;
      return true;
    } catch (err: any) {
      console.warn('[Amico PcmEngine] Erreur initialisation micro:', err);
      const isPerm =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission');

      const message = isPerm
        ? 'Accès au micro refusé. Veuillez autoriser le microphone dans votre navigateur pour converser avec Amico.'
        : err?.name === 'NotFoundError'
        ? 'Aucun microphone détecté sur cet appareil.'
        : 'Impossible d’accéder au microphone. Vérifiez les autorisations de votre navigateur.';

      this.callbacks.onError(message, isPerm);
      this.stop();
      return false;
    }
  }

  /**
   * Stops capture and releases all media tracks
   */
  public stop() {
    this.isCapturing = false;
    this.isSpeakingMonitoring = false;
    this.consecutiveLoudFrames = 0;

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.callbacks.onVolumeChange(0);
    this.callbacks.onVoiceActivity(false);
  }

  public isActive(): boolean {
    return this.isCapturing;
  }
}
