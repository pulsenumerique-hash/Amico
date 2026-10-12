/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gemini Live API Client Session Manager:
 * 1. Context window compression: slidingWindow: {} so conversation never saturates
 * 2. Session resumption: sessionResumption: {} with dynamic handle updates
 * 3. Bidirectional audio transcription: inputAudioTranscription: {} & outputAudioTranscription: {}
 * 4. Zero-audio-drop rollover on goAway signal: opens new connection with resumption handle, swaps, closes old
 * 5. Automatic reconnection with exponential backoff (1s, 2s, 4s... max 15s) requesting fresh ephemeral token
 * 6. Memory recovery fallback: if resumption handle expires, starts fresh session reinjecting student memories in system prompt
 * 7. Discrete "reconnexion…" UI indicator without screen blanks
 * 8. Screen wake lock (Wake Lock API) active during voice conversation
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { indexedDbStore } from './indexedDbStore';
import { wakeLockService } from './wakeLockService';
import { pedagogicalStore } from './pedagogicalStore';

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
  private maxReconnectAttempts = 8;
  private reconnectTimeout: any = null;
  private isSwappingSession = false;

  constructor(callbacks: LiveSessionCallbacks, config?: LiveSessionConfig) {
    this.callbacks = callbacks;
    this.config = {
      companionName: 'Marco',
      voiceGender: 'male',
      ...config,
    };

    // Load existing resumption handle from IndexedDB & local storage
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
   * Fetches an ephemeral auth token from the serverless /api/token route
   * ensuring master GEMINI_API_KEY is never exposed in client bundle.
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
   * Builds the live session config compliant with:
   * 1. contextWindowCompression: { slidingWindow: {} }
   * 2. sessionResumption: { handle: ... } or {}
   * 3. inputAudioTranscription: {} & outputAudioTranscription: {}
   * 4. Memory reinjection when no resumption handle is present
   */
  private buildLiveConfig(): any {
    const voiceName = this.config.voiceGender === 'female' ? 'Kore' : 'Puck';
    const companionName = this.config.companionName || 'Marco';

    let baseInstruction =
      this.config.systemInstruction ||
      `Sei ${companionName}, un compagno di conversazione madrelingua italiano. Parla SEMPRE in italiano naturale, espressivo e fluido. Ascolta con attenzione e reagisci con calore. Rispondi con frasi orali concise ed efficaci.`;

    // 4. Si aucun handle de reprise (nouveau départ ou handle expiré), réinjecter le résumé de la mémoire
    if (!this.resumptionHandle) {
      const memorySummary = pedagogicalStore.getPedagogicalMemorySummary();
      baseInstruction = `${baseInstruction}\n\n${memorySummary}`;
    }

    const liveConfig: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
      systemInstruction: baseInstruction,
      // Input & Output audio transcription
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // 1. Sliding window context compression: never saturates or drops out
      contextWindowCompression: {
        slidingWindow: {},
      },
      // 2. Session resumption
      sessionResumption: this.resumptionHandle
        ? { handle: this.resumptionHandle }
        : {},
    };

    return liveConfig;
  }

  /**
   * Creates Live session event callbacks
   */
  private buildSessionCallbacks(isHandoverSession = false) {
    return {
      onopen: () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.callbacks.onReconnecting(false);
        this.callbacks.onConnected();
        wakeLockService.acquireLock();
        console.log('[Amico Live] Connexion WebSocket établie avec succès.');
      },

      onmessage: (message: LiveServerMessage) => {
        // 1. Mise à jour continue du handle de reprise
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

        // 2. Écoute du message goAway du serveur : bascule immédiate sans coupure
        if (message.goAway) {
          console.warn('[Amico Live] Signal goAway reçu du serveur. Déclenchement de la bascule sans coupure...');
          this.handleServerGoAway(message.goAway);
        }

        // Audio & transcriptions
        if (message.serverContent) {
          const modelTurn = message.serverContent.modelTurn;
          if (modelTurn?.parts) {
            for (const part of modelTurn.parts) {
              if (part.inlineData?.data) {
                this.callbacks.onAudioChunk(part.inlineData.data);
              }
              if (part.text) {
                this.callbacks.onAssistantTranscript(part.text);
              }
            }
          }

          if ((message.serverContent as any).userTurn?.parts) {
            for (const part of (message.serverContent as any).userTurn.parts) {
              if (part.text) {
                this.callbacks.onUserTranscript(part.text);
              }
            }
          }

          if (message.serverContent.turnComplete) {
            this.callbacks.onTurnComplete();
          }

          if (message.serverContent.interrupted) {
            console.log('[Amico Live] Barge-in confirmé par le modèle.');
            this.callbacks.onInterrupted();
          }
        }
      },

      onerror: (err: any) => {
        console.warn('[Amico Live] Erreur transport WebSocket:', err);
        // Si le handle de reprise a causé l'erreur (expiré / invalide)
        const errMsg = String(err?.message || err);
        if (
          this.resumptionHandle &&
          (errMsg.includes('handle') ||
            errMsg.includes('resumption') ||
            errMsg.includes('invalid') ||
            errMsg.includes('expired') ||
            errMsg.includes('400'))
        ) {
          console.warn('[Amico Live] Jeton de reprise expiré/rejeté. Réinitialisation et reprise avec mémoire...');
          this.resumptionHandle = null;
          try {
            localStorage.removeItem(RESUMPTION_STORAGE_KEY);
          } catch (e) {}
          indexedDbStore.delete(RESUMPTION_STORAGE_KEY);
        }
        if (!isHandoverSession && !this.isSwappingSession) {
          this.triggerSilentAutoReconnect('Erreur réseau');
        }
      },

      onclose: (e: any) => {
        console.log(`[Amico Live] Session fermée (code: ${e?.code}, raison: ${e?.reason || 'normale'})`);
        if (!isHandoverSession && !this.isSwappingSession) {
          this.session = null;
          if (!this.isExplicitlyClosed) {
            this.triggerSilentAutoReconnect('Déconnexion WebSocket inattendue');
          }
        }
      },
    };
  }

  /**
   * Connects to Gemini Live API WebSocket session
   */
  public async connect(): Promise<boolean> {
    if (this.session || this.isConnecting) return true;

    this.isConnecting = true;
    this.isExplicitlyClosed = false;

    try {
      // Redemande un jeton éphémère frais à chaque (re)connexion
      const ephemeralToken = await this.fetchEphemeralToken();

      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: {
          apiVersion: 'v1alpha',
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const liveConfig = this.buildLiveConfig();

      this.session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: liveConfig,
        callbacks: this.buildSessionCallbacks(false),
      });

      this.isConnecting = false;
      return true;
    } catch (err: any) {
      this.isConnecting = false;
      this.session = null;
      console.warn('[Amico Live] Échec initial de connexion:', err?.message || err);

      // Si le handle de reprise est expiré ou invalide, l'effacer et retenter avec la mémoire
      const errMsg = String(err?.message || err);
      if (
        this.resumptionHandle &&
        (errMsg.includes('handle') ||
          errMsg.includes('resumption') ||
          errMsg.includes('invalid') ||
          errMsg.includes('expired') ||
          errMsg.includes('400'))
      ) {
        console.warn('[Amico Live] Jeton de reprise expiré lors du connect(). Retentative avec réinjection mémoire...');
        this.resumptionHandle = null;
        try {
          localStorage.removeItem(RESUMPTION_STORAGE_KEY);
        } catch (e) {}
        indexedDbStore.delete(RESUMPTION_STORAGE_KEY);
        return this.connect();
      }

      this.triggerSilentAutoReconnect('Erreur tentative connect');
      return false;
    }
  }

  /**
   * 2. Écoute le message goAway du serveur :
   * Ouvre une nouvelle connexion avec le dernier handle de reprise,
   * bascule dessus sans couper l'audio, puis ferme l'ancienne.
   */
  private async handleServerGoAway(goAway: any) {
    if (this.isExplicitlyClosed || this.isSwappingSession) return;
    this.isSwappingSession = true;

    try {
      console.log('[Amico Live] Ouverture en arrière-plan d’une nouvelle connexion de reprise...');
      const oldSession = this.session;

      // 1. Demande un nouveau jeton à /api/token
      const freshToken = await this.fetchEphemeralToken();
      const ai = new GoogleGenAI({
        apiKey: freshToken,
        httpOptions: {
          apiVersion: 'v1alpha',
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const config = this.buildLiveConfig();

      // 2. Ouvre la nouvelle connexion avec le dernier handle de reprise
      const newSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config,
        callbacks: this.buildSessionCallbacks(true),
      });

      // 3. Bascule dessus sans couper l'audio
      this.session = newSession;
      this.isSwappingSession = false;
      this.reconnectAttempts = 0;
      this.callbacks.onReconnecting(false);
      console.log('[Amico Live] Bascule fluide réussie. Session active permutée avec succès.');

      // 4. Ferme l'ancienne connexion
      if (oldSession) {
        try {
          oldSession.close();
        } catch (e) {}
      }
    } catch (err) {
      this.isSwappingSession = false;
      console.warn('[Amico Live] Échec de la bascule à chaud goAway. Déclenchement reconnexion silencieuse:', err);
      this.triggerSilentAutoReconnect('GoAway failover');
    }
  }

  /**
   * 3. Reconnexion automatique avec backoff exponentiel (1s, 2s, 4s… max 15s)
   * Redemande un jeton à /api/token et utilise le handle de reprise.
   * 5. Affiche un indicateur "reconnexion…" discret sans page blanche ni écran d'erreur bloquant.
   */
  private triggerSilentAutoReconnect(reason: string) {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimeout) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Amico Live] Limite maximale de tentatives de reconnexion atteinte.');
      this.callbacks.onReconnecting(false);
      this.callbacks.onError('La connexion a été momentanément interrompue. Touchez le bouton pour reprendre.');
      return;
    }

    this.reconnectAttempts++;
    this.callbacks.onReconnecting(true, 'reconnexion…');

    // Backoff : 1s, 2s, 4s, 8s, max 15s
    const backoffTable = [1000, 2000, 4000, 8000, 15000];
    const delay = backoffTable[Math.min(this.reconnectAttempts - 1, backoffTable.length - 1)];

    console.log(
      `[Amico Live] Reconnexion programmée dans ${delay}ms (Tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts}) [Raison: ${reason}]`
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

        const success = await this.connect();
        if (success) {
          this.reconnectAttempts = 0;
          this.callbacks.onReconnecting(false);
        }
      } catch (e) {
        // Retenté au prochain passage
      }
    }, delay);
  }

  /**
   * Envoi des trames audio micro 16 kHz 16-bit PCM en continu
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
      console.warn('[Amico Live] Erreur lors de l’envoi audio PCM:', err);
      return false;
    }
  }

  public interrupt() {
    // Interruption du flux
  }

  /**
   * Fermeture volontaire par l'utilisateur (appui sur Stop)
   */
  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
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
