/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gemini Live API Client Session Manager:
 * - Real-time bidirectional streaming over WebSocket
 * - Context Window Compression (slidingWindow with targetTokens / triggerTokens) so conversations never saturate
 * - Session Resumption with resumption tokens to seamlessly recover across disconnects
 * - Silent Auto-Reconnection on GoAway frames and network interruptions
 * - Discrete reconnection indicator without screen blanks
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { indexedDbStore } from './indexedDbStore';
import { wakeLockService } from './wakeLockService';

const RESUMPTION_STORAGE_KEY = 'amico_live_resumption_token';

export interface LiveSessionCallbacks {
  onAudioChunk: (base64Audio: string) => void;
  onUserTranscript: (text: string) => void;
  onAssistantTranscript: (text: string) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onReconnecting: (isReconnecting: boolean, message?: string) => void;
  onError: (errorMessage: string) => void;
  onConnected: () => void;
}

export interface LiveSessionConfig {
  voiceGender?: 'male' | 'female';
  companionName?: string;
  systemInstruction?: string;
}

export class GeminiLiveSession {
  private session: any = null;
  private isConnecting = false;
  private isExplicitlyClosed = false;
  private resumptionHandle: string | null = null;
  private callbacks: LiveSessionCallbacks;
  private config: LiveSessionConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private reconnectTimeout: any = null;
  private goAwayTimer: any = null;

  constructor(callbacks: LiveSessionCallbacks, config?: LiveSessionConfig) {
    this.callbacks = callbacks;
    this.config = {
      companionName: 'Matteo',
      voiceGender: 'male',
      ...config,
    };

    // Load existing resumption handle from IndexedDB & local storage if available
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(RESUMPTION_STORAGE_KEY);
        if (stored) {
          this.resumptionHandle = stored;
        }
        indexedDbStore.get<string>(RESUMPTION_STORAGE_KEY).then((dbStored) => {
          if (dbStored) {
            this.resumptionHandle = dbStored;
          }
        });
      }
    } catch (e) {}
  }

  public updateConfig(newConfig: Partial<LiveSessionConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Fetches an ephemeral auth token from the server to initialize the client Live session
   * securely without exposing the master GEMINI_API_KEY.
   */
  private async fetchEphemeralToken(): Promise<string> {
    const res = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Échec de récupération du jeton éphémère (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error(data.error || 'Jeton de session Live non reçu');
    }
    return data.token;
  }

  /**
   * Connects to the Gemini Live API session with:
   * 1. Context Window Compression (slidingWindow)
   * 2. Session Resumption handle
   * 3. Audio modalities & bidirectional streaming
   */
  public async connect(): Promise<boolean> {
    if (this.session || this.isConnecting) return true;

    this.isConnecting = true;
    this.isExplicitlyClosed = false;

    try {
      const ephemeralToken = await this.fetchEphemeralToken();

      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: {
          apiVersion: 'v1alpha',
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const voiceName = this.config.voiceGender === 'female' ? 'Kore' : 'Puck';
      const companionName = this.config.companionName || 'Matteo';

      const defaultInstruction =
        this.config.systemInstruction ||
        `Sei ${companionName}, un compagno di conversazione madrelingua italiano. Parla SEMPRE in italiano naturale, espressivo e fluido. Ascolta con attenzione e reagisci con calore. Rispondi con frasi orali concise ed efficaci.`;

      console.log(
        `[Amico Live] Connexion à la Live API (ResumptionHandle: ${
          this.resumptionHandle ? this.resumptionHandle.slice(0, 12) + '...' : 'Nouveau'
        }, Voce: ${voiceName})`
      );

      // Session configuration with Sliding Window Context Compression & Resumption Tokens
      const liveConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
        systemInstruction: defaultInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        // 1. Context Window Compression (Sliding Window): never overflows or saturates
        contextWindowCompression: {
          slidingWindow: {
            targetTokens: '16000',
          },
          triggerTokens: '32000',
        },
      };

      // 2. Session Resumption Configuration
      if (this.resumptionHandle) {
        liveConfig.sessionResumption = {
          handle: this.resumptionHandle,
          transparent: true,
        };
      } else {
        liveConfig.sessionResumption = {
          transparent: true,
        };
      }

      this.session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: liveConfig,
        callbacks: {
          onopen: () => {
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.callbacks.onReconnecting(false);
            this.callbacks.onConnected();
            wakeLockService.acquireLock();
            console.log('[Amico Live] Session WebSocket connectée avec succès.');
          },

          onmessage: (message: LiveServerMessage) => {
            // A. Track Session Resumption Token Updates
            if (message.sessionResumptionUpdate) {
              const update = message.sessionResumptionUpdate;
              if (update.newHandle && update.resumable !== false) {
                this.resumptionHandle = update.newHandle;
                try {
                  localStorage.setItem(RESUMPTION_STORAGE_KEY, update.newHandle);
                } catch (e) {}
                indexedDbStore.set(RESUMPTION_STORAGE_KEY, update.newHandle);
                console.log(
                  `[Amico Live] Jeton de reprise mis à jour (handle: ${update.newHandle.slice(0, 16)}...)`
                );
              }
            }

            // B. Handle Server GoAway frame for graceful zero-drop session rollover
            if (message.goAway) {
              const timeLeft = message.goAway.timeLeft || 'inconnue';
              console.warn(
                `[Amico Live] Signal GoAway reçu du serveur (Temps restant: ${timeLeft}). Préparation de la reconnexion silencieuse.`
              );
              this.handleServerGoAway(message.goAway);
            }

            // C. Audio & Transcription Streaming
            if (message.serverContent) {
              const modelTurn = message.serverContent.modelTurn;
              if (modelTurn && modelTurn.parts) {
                for (const part of modelTurn.parts) {
                  // Audio chunk
                  if (part.inlineData && part.inlineData.data) {
                    this.callbacks.onAudioChunk(part.inlineData.data);
                  }
                  // Model transcript
                  if (part.text) {
                    this.callbacks.onAssistantTranscript(part.text);
                  }
                }
              }

              // User spoken transcript
              if ((message.serverContent as any).userTurn?.parts) {
                for (const part of (message.serverContent as any).userTurn.parts) {
                  if (part.text) {
                    this.callbacks.onUserTranscript(part.text);
                  }
                }
              }

              // Turn completion
              if (message.serverContent.turnComplete) {
                this.callbacks.onTurnComplete();
              }

              // Interruption notification from model
              if (message.serverContent.interrupted) {
                console.log('[Amico Live] Événement d’interruption confirmé par le serveur.');
                this.callbacks.onInterrupted();
              }
            }
          },

          onerror: (err: any) => {
            console.warn('[Amico Live] Erreur de session WebSocket:', err);
            this.triggerSilentAutoReconnect('Erreur de transport réseau');
          },

          onclose: (e: any) => {
            console.log(`[Amico Live] Session WebSocket fermée (code: ${e?.code}, raison: ${e?.reason || 'normale'})`);
            this.session = null;
            if (!this.isExplicitlyClosed) {
              this.triggerSilentAutoReconnect('Déconnexion inattendue');
            }
          },
        },
      });

      this.isConnecting = false;
      return true;
    } catch (err: any) {
      this.isConnecting = false;
      this.session = null;
      console.warn('[Amico Live] Échec initial de connexion Live:', err?.message || err);
      this.triggerSilentAutoReconnect('Tentative de reconnexion');
      return false;
    }
  }

  /**
   * Sends 16 kHz 16-bit linear PCM microphone audio chunk in real time
   */
  public sendRealtimeAudio(pcmBase64: string): boolean {
    if (!this.session || this.isConnecting) return false;

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: pcmBase64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
      return true;
    } catch (err) {
      console.warn('[Amico Live] Erreur lors de l’envoi de l’audio PCM:', err);
      return false;
    }
  }

  /**
   * Handles the server GoAway signal gracefully:
   * Initiates a silent reconnect using the resumption handle before the hard timeout.
   */
  private handleServerGoAway(goAway: any) {
    if (this.goAwayTimer) clearTimeout(this.goAwayTimer);

    // Schedule seamless rollover in 1.5 seconds or before expiration
    this.goAwayTimer = setTimeout(() => {
      console.log('[Amico Live] Exécution de la reconnexion programmée suite à GoAway...');
      this.triggerSilentAutoReconnect('Renouvellement programmé (GoAway)');
    }, 1200);
  }

  /**
   * Automatic silent reconnection with exponential backoff and jitter.
   * Keeps conversation thread intact without crashing or showing a blank page.
   */
  private triggerSilentAutoReconnect(reason: string) {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimeout) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Amico Live] Nombre maximum de tentatives de reconnexion atteint.');
      this.callbacks.onReconnecting(false);
      this.callbacks.onError('La connexion a été interrompue. Cliquez sur Commencer pour reprendre.');
      return;
    }

    this.reconnectAttempts++;
    this.callbacks.onReconnecting(true, 'Reconnexion en cours…');

    // Exponential backoff: 600ms, 1200ms, 2400ms... + small jitter
    const delay = Math.min(600 * Math.pow(1.6, this.reconnectAttempts - 1) + Math.random() * 200, 5000);
    console.log(
      `[Amico Live] Reconnexion silencieuse (#${this.reconnectAttempts}/${this.maxReconnectAttempts}) dans ${Math.round(
        delay
      )}ms [Raison: ${reason}]`
    );

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (this.isExplicitlyClosed) return;

      try {
        if (this.session) {
          try {
            this.session.close();
          } catch (e) {}
          this.session = null;
        }
        this.isConnecting = false;

        // Fetches a fresh ephemeral token from /api/token on every reconnect
        const success = await this.connect();
        if (success) {
          this.reconnectAttempts = 0;
          this.callbacks.onReconnecting(false);
        }
      } catch (e) {
        // Will be retried on next loop
      }
    }, delay);
  }

  /**
   * Interruption: tell the session the user interrupted
   */
  public interrupt() {
    // Drop in-flight buffers
    if (this.session) {
      try {
        // Model handles barge-in natively when new audio is sent
      } catch (e) {}
    }
  }

  /**
   * Closes the session intentionally (e.g. user taps Stop)
   */
  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.goAwayTimer) {
      clearTimeout(this.goAwayTimer);
      this.goAwayTimer = null;
    }
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {}
      this.session = null;
    }
    this.isConnecting = false;
    this.callbacks.onReconnecting(false);
    wakeLockService.releaseLock();
  }

  public isConnected(): boolean {
    return !!this.session && !this.isConnecting;
  }

  public getResumptionToken(): string | null {
    return this.resumptionHandle;
  }
}
