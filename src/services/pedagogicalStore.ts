/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserLearningProfile,
  PedagogicalError,
  UserPersonalMemory,
  CefrMultiDimensions,
  CefrLevel,
  ErrorLearningStatus,
  ErrorSeverity,
  ErrorCategory,
} from '../types';

const STORAGE_KEY = 'amico_learning_profile_v2';

const DEFAULT_DIMENSIONS: CefrMultiDimensions = {
  listeningComprehension: {
    score: 68,
    estimatedLevel: 'B1',
    confidence: 80,
    recentTrend: 'in_crescita',
    observableExamples: ['Capisce le domande aperte e risponde a tono senza ripetizioni.'],
  },
  grammaticalAccuracy: {
    score: 58,
    estimatedLevel: 'A2',
    confidence: 75,
    recentTrend: 'stabile',
    observableExamples: ['Uso corretto del presente indicativo; incertezze su passato prossimo vs imperfetto.'],
  },
  vocabularyRichness: {
    score: 62,
    estimatedLevel: 'B1',
    confidence: 70,
    recentTrend: 'in_crescita',
    observableExamples: ['Vocabolario adeguato per argomenti quotidiani; pochi sinonimi astratti.'],
  },
  spontaneousVocabulary: {
    score: 60,
    estimatedLevel: 'B1',
    confidence: 72,
    recentTrend: 'in_crescita',
    observableExamples: ['Usa parole chiave con prontezza; ricorre raramente alla lingua madre.'],
  },
  fluency: {
    score: 64,
    estimatedLevel: 'B1',
    confidence: 78,
    recentTrend: 'in_crescita',
    observableExamples: ['Pause di riflessione naturali; buon ritmo nelle frasi affermative brevi.'],
  },
  pronunciationIntelligibility: {
    score: 72,
    estimatedLevel: 'B1',
    confidence: 82,
    recentTrend: 'stabile',
    observableExamples: ['Intelligibilità elevata; attenzione al raddoppiamento fonosintattico e alle vocali chiuse.'],
  },
  discourseCoherence: {
    score: 61,
    estimatedLevel: 'B1',
    confidence: 65,
    recentTrend: 'stabile',
    observableExamples: ['Collega le frasi con connettori semplici (e, ma, perché, quindi).'],
  },
  argumentation: {
    score: 52,
    estimatedLevel: 'A2',
    confidence: 60,
    recentTrend: 'dati_insufficienti',
    observableExamples: ['Esprime preferenze personali; necessita di guida per contro-argomentare.'],
  },
  interaction: {
    score: 74,
    estimatedLevel: 'B1',
    confidence: 85,
    recentTrend: 'in_crescita',
    observableExamples: ['Ottima reattività nelle risposte; gestione spontanea dei turni di parola.'],
  },
  complexTopics: {
    score: 48,
    estimatedLevel: 'A2',
    confidence: 55,
    recentTrend: 'dati_insufficienti',
    observableExamples: ['Preferisce temi concreti ed esperienziali rispetto ad astrazioni teoriche.'],
  },
};

const DEFAULT_PROFILE: UserLearningProfile = {
  name: 'Studente',
  companionName: 'Matteo',
  companionAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  voiceGender: 'male',
  voiceSpeed: 1.0,
  voiceEngine: 'gemini_neural',
  micSensitivityPreset: 'high',
  micInputGain: 1.4,
  pauseToleranceMs: 3000,
  correctionMode: 'targeted',
  conversationStyle: 'amico',
  estimatedCefrLevel: 'B1',
  dailyGoalMinutes: 10,
  todayPracticeSeconds: 180,
  streakDays: 4,
  longestStreakDays: 6,
  streakHistory: [
    new Date(Date.now() - 86400000 * 12).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 11).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 9).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
  ],
  lastSessionDate: new Date().toISOString().split('T')[0],
  confidenceScore: 76,
  multiDimensions: DEFAULT_DIMENSIONS,
  memories: [
    {
      id: 'mem_1',
      content: 'Ama viaggiare in treno in Italia e vorrebbe visitare la Sicilia e Bologna.',
      category: 'interesse',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'mem_2',
      content: 'Obiettivo: sostenere una conversazione di 20 minuti senza blocchi o ansia.',
      category: 'obiettivo',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'mem_3',
      content: 'Lavora nel settore digitale e gli piace la cucina toscana.',
      category: 'aneddoto',
      createdAt: Date.now() - 86400000 * 2,
    },
  ],
  errors: [
    {
      id: 'err_1',
      timestamp: Date.now() - 86400000 * 2,
      originalText: 'Ieri vado al mercato e compro dei frutti.',
      correctedText: 'Ieri sono andato al mercato e ho comprato della frutta.',
      category: 'coniugazione',
      severity: 'moderata',
      ruleKey: 'passato_prossimo_vs_presente',
      ruleName: 'Passato Prossimo per azioni concluse nel passato',
      explanation: 'Per azioni concluse in un momento passato definito (ieri), si usa il passato prossimo, non il presente. Inoltre si usa il collettivo singolare "della frutta".',
      example: 'Ieri ho visto un bel film e ho mangiato una pizza.',
      status: 'in_apprendimento',
      timesEncountered: 2,
      lastPracticed: Date.now() - 86400000,
    },
    {
      id: 'err_2',
      timestamp: Date.now() - 86400000,
      originalText: 'Vado in Italia per imparare la lingua con piacere.',
      correctedText: 'Vado in Italia per imparare la lingua con piacere.',
      category: 'preposizioni',
      severity: 'lieve',
      ruleKey: 'preposizioni_in_con_nazioni',
      ruleName: 'Preposizione "in" con nomi di stati e nazioni',
      explanation: 'Uso corretto della preposizione "in" con l’Italia. Ottima applicazione della regola!',
      example: 'Vivo in Italia, vado in Francia.',
      status: 'in_consolidamento',
      timesEncountered: 1,
      lastPracticed: Date.now() - 86400000,
    },
  ],
  completedSessionsCount: 7,
  totalSpeakingTimeSeconds: 1420,
  totalWordsProduced: 890,
};

export class PedagogicalStoreService {
  private static instance: PedagogicalStoreService;
  private profile: UserLearningProfile;

  private constructor() {
    this.profile = this.loadInitialProfile();
    this.checkDayReset();
    this.syncWithServer();
  }

  public static getInstance(): PedagogicalStoreService {
    if (!PedagogicalStoreService.instance) {
      PedagogicalStoreService.instance = new PedagogicalStoreService();
    }
    return PedagogicalStoreService.instance;
  }

  private loadInitialProfile(): UserLearningProfile {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_PROFILE,
            ...parsed,
            multiDimensions: {
              ...DEFAULT_DIMENSIONS,
              ...(parsed.multiDimensions || {}),
            },
          };
        }
      }
    } catch (e) {
      console.warn('Errore lettura localStorage:', e);
    }
    return DEFAULT_PROFILE;
  }

  private checkDayReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.profile.lastSessionDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.profile.lastSessionDate === yesterday) {
        this.profile.streakDays += 1;
      } else if (this.profile.lastSessionDate < yesterday) {
        // Streak interrupted
        this.profile.streakDays = 1;
      }
      this.profile.todayPracticeSeconds = 0;
      this.profile.lastSessionDate = today;
      this.persist();
    }
  }

  public getProfile(): UserLearningProfile {
    return { ...this.profile };
  }

  public updateProfile(updates: Partial<UserLearningProfile>) {
    this.profile = {
      ...this.profile,
      ...updates,
    };
    this.persist();
  }

  public addSpeakingTime(seconds: number, wordCount: number = 0) {
    this.profile.todayPracticeSeconds += seconds;
    this.profile.totalSpeakingTimeSeconds += seconds;
    if (wordCount > 0) {
      this.profile.totalWordsProduced += wordCount;
    }

    const today = new Date().toISOString().split('T')[0];
    if (!this.profile.streakHistory) {
      this.profile.streakHistory = [];
    }
    if (!this.profile.streakHistory.includes(today)) {
      this.profile.streakHistory.push(today);
    }
    if (!this.profile.longestStreakDays || this.profile.streakDays > this.profile.longestStreakDays) {
      this.profile.longestStreakDays = this.profile.streakDays;
    }

    this.persist();
  }

  /**
   * Pedagogical Engine: Record or update an observed error
   */
  public registerPedagogicalAnalysis(analysis: {
    hasMistake: boolean;
    isTranscriptionUncertain?: boolean;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    originalSegment?: string;
    correctedSegment?: string;
    ruleKey?: string;
    ruleName?: string;
    explanation?: string;
    example?: string;
  }) {
    if (!analysis.hasMistake || analysis.isTranscriptionUncertain) {
      // Respect rule: uncertain transcriptions must never degrade pedagogical score or trigger false errors
      return;
    }

    const ruleKey = analysis.ruleKey || 'regola_generale';
    const existingIndex = this.profile.errors.findIndex((e) => e.ruleKey === ruleKey);

    if (existingIndex >= 0) {
      const existing = this.profile.errors[existingIndex];
      const nextStatus = this.advanceErrorStatus(existing.status, false);

      this.profile.errors[existingIndex] = {
        ...existing,
        originalText: analysis.originalSegment || existing.originalText,
        correctedText: analysis.correctedSegment || existing.correctedText,
        explanation: analysis.explanation || existing.explanation,
        timesEncountered: existing.timesEncountered + 1,
        status: nextStatus,
        lastPracticed: Date.now(),
      };
    } else {
      const newError: PedagogicalError = {
        id: 'err_' + Date.now(),
        timestamp: Date.now(),
        originalText: analysis.originalSegment || '',
        correctedText: analysis.correctedSegment || '',
        category: analysis.category || 'grammatica',
        severity: analysis.severity || 'lieve',
        ruleKey: ruleKey,
        ruleName: analysis.ruleName || 'Regola Grammaticale',
        explanation: analysis.explanation || 'Uso raccomandato in italiano.',
        example: analysis.example || '',
        status: 'rilevata_una_volta',
        timesEncountered: 1,
        lastPracticed: Date.now(),
      };
      this.profile.errors.unshift(newError);
    }

    this.persist();
  }

  /**
   * Promotes error mastery status after intentional practice or confirms mastery
   */
  public promoteErrorStatus(errorId: string, success: boolean) {
    const idx = this.profile.errors.findIndex((e) => e.id === errorId);
    if (idx === -1) return;

    const current = this.profile.errors[idx];
    const newStatus = this.advanceErrorStatus(current.status, success);

    this.profile.errors[idx] = {
      ...current,
      status: newStatus,
      lastPracticed: Date.now(),
    };
    this.persist();
  }

  private advanceErrorStatus(current: ErrorLearningStatus, success: boolean): ErrorLearningStatus {
    if (success) {
      switch (current) {
        case 'non_valutata':
        case 'rilevata_una_volta':
          return 'da_confermare';
        case 'da_confermare':
          return 'in_apprendimento';
        case 'in_apprendimento':
          return 'in_consolidamento';
        case 'in_consolidamento':
          return 'padroneggiata';
        case 'da_ripassare':
          return 'in_consolidamento';
        case 'padroneggiata':
          return 'padroneggiata';
      }
    } else {
      switch (current) {
        case 'padroneggiata':
          return 'da_ripassare';
        case 'in_consolidamento':
          return 'in_apprendimento';
        default:
          return 'in_apprendimento';
      }
    }
  }

  /**
   * Personal Memory Management: add, edit, remove
   */
  public addMemory(content: string, category: UserPersonalMemory['category'] = 'interesse') {
    const newMem: UserPersonalMemory = {
      id: 'mem_' + Date.now(),
      content: content.trim(),
      category,
      createdAt: Date.now(),
    };
    this.profile.memories.push(newMem);
    this.persist();
    return newMem;
  }

  public deleteMemory(id: string) {
    this.profile.memories = this.profile.memories.filter((m) => m.id !== id);
    this.persist();
  }

  public updateMemory(id: string, newContent: string) {
    const mem = this.profile.memories.find((m) => m.id === id);
    if (mem) {
      mem.content = newContent.trim();
      this.persist();
    }
  }

  /**
   * Update multidimensional CEFR scores from evaluation
   */
  public updateCefrScores(evaluation: {
    estimatedCefrLevel?: CefrLevel;
    confidenceScore?: number;
    scores?: Record<string, number>;
  }) {
    if (evaluation.estimatedCefrLevel) {
      this.profile.estimatedCefrLevel = evaluation.estimatedCefrLevel;
    }
    if (evaluation.confidenceScore) {
      this.profile.confidenceScore = evaluation.confidenceScore;
    }
    if (evaluation.scores) {
      for (const [key, val] of Object.entries(evaluation.scores)) {
        if ((this.profile.multiDimensions as any)[key]) {
          const dim = (this.profile.multiDimensions as any)[key];
          // Smooth progression: new score is rolling average to avoid steep artificial swings
          dim.score = Math.round(dim.score * 0.7 + val * 0.3);
          dim.confidence = Math.min(95, dim.confidence + 2);
        }
      }
    }
    this.persist();
  }

  /**
   * Persist to local storage and sync to server
   */
  private persist() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      }
      this.syncWithServer();
    } catch (e) {
      console.warn('[Amico Store] Impossibile salvare localmente:', e);
    }
  }

  private async syncWithServer() {
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: this.profile }),
      });
    } catch (e) {
      // Offline / transient network, safe to ignore
    }
  }

  /**
   * Export all user data as JSON
   */
  public exportData(): string {
    return JSON.stringify(this.profile, null, 2);
  }

  /**
   * Complete GDPR deletion
   */
  public async wipeAllData(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      await fetch('/api/user-data', { method: 'DELETE' });
      this.profile = { ...DEFAULT_PROFILE };
    } catch (e) {
      console.warn('[Amico Store] Errore cancellazione dati:', e);
    }
  }

  /**
   * Generates a pedagogical and personal memory summary for Gemini Live system prompt.
   * Injected when session resumption handle is expired or unavailable, ensuring total conversational continuity.
   */
  public getPedagogicalMemorySummary(): string {
    const companion = this.profile.companionName || 'Marco';
    const memoriesList = (this.profile.memories || [])
      .map((m) => `- [${m.category}] ${m.content}`)
      .join('\n');
    const errorsToReview = (this.profile.errors || [])
      .filter((e) => e.status === 'da_ripassare' || e.status === 'in_apprendimento')
      .slice(0, 5)
      .map((e) => `- ${e.ruleName}: "${e.originalText}" -> correzione raccomandata: "${e.correctedText}"`)
      .join('\n');

    return `
CONTINUITÀ DELLA MEMORIA (SEGNALATORE DI RIPRESA):
Sei ${companion}. Conosci già molto bene questo studente. Non salutare come se fosse la prima volta!
- Nome studente: ${this.profile.name || 'Studente'}
- Livello stimato: ${this.profile.estimatedCefrLevel || 'B1'}
- Stile di conversazione: ${this.profile.conversationStyle || 'amico'} (spontaneo, amichevole, parlata viva)

MEMORIE PERSONALI E INTERESSI:
${memoriesList || '- Nessuna memoria specifica registrata.'}

PUNTI GRAMMATICALI IN FASE DI APPRENDIMENTO:
${errorsToReview || '- Nessuna lacuna particolare.'}
`.trim();
  }
}

export const pedagogicalStore = PedagogicalStoreService.getInstance();
