/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'ERROR';

export type MicSensitivityPreset = 'high' | 'balanced' | 'noisy_env';

export interface TurnLatencyMetrics {
  turnId: number;
  userSpeechEnd: number;
  finalTranscriptReceived: number;
  aiProcessingStart: number;
  aiResponseReceived: number;
  audioPlaybackStart: number;
  audioPlaybackEnd?: number;
  totalLatencyMs: number;
  aiDurationMs: number;
  ttsDurationMs?: number;
}

export interface AudioDiagnosticLog {
  timestamp: string;
  type:
    | 'USER_START'
    | 'USER_STOP'
    | 'TRACK_START'
    | 'TRACK_STOP'
    | 'REC_START'
    | 'REC_SPEECH_START'
    | 'REC_SPEECH_END'
    | 'REC_RESULT'
    | 'REC_END'
    | 'REC_ERROR'
    | 'RESTART_ATTEMPT'
    | 'SILENCE_TRIGGER'
    | 'PROCESSING_START'
    | 'AUDIO_PLAY_START'
    | 'AUDIO_PLAY_END'
    | 'LATENCY_METRIC';
  state: VoiceState;
  details: string;
  trackState?: string;
  latencyMs?: number;
}

export type CorrectionMode = 'light' | 'targeted' | 'deep';

export type ConversationStyle =
  | 'amico'
  | 'professore'
  | 'dibattito'
  | 'giornata'
  | 'cultura'
  | 'oratoria'
  | 'colloquio'
  | 'simulazione'
  | 'veloce'
  | 'pronuncia';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ErrorLearningStatus =
  | 'non_valutata'
  | 'rilevata_una_volta'
  | 'da_confermare'
  | 'in_apprendimento'
  | 'in_consolidamento'
  | 'padroneggiata'
  | 'da_ripassare';

export type ErrorSeverity = 'lieve' | 'moderata' | 'grave';

export type ErrorCategory =
  | 'grammatica'
  | 'coniugazione'
  | 'concordanza'
  | 'articoli'
  | 'preposizioni'
  | 'pronomi'
  | 'sintassi'
  | 'vocabolario'
  | 'falsi_amici'
  | 'idiomi'
  | 'registro'
  | 'pronuncia_trascrizione';

export interface PedagogicalError {
  id: string;
  timestamp: number;
  originalText: string;
  correctedText: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  ruleKey: string;
  ruleName: string;
  explanation: string;
  example: string;
  status: ErrorLearningStatus;
  timesEncountered: number;
  lastPracticed?: number;
  isTranscriptionUncertain?: boolean;
}

export interface CefrDimensionScore {
  score: number; // 0 - 100
  estimatedLevel: CefrLevel;
  confidence: number; // 0 - 100
  recentTrend: 'in_crescita' | 'stabile' | 'in_flessione' | 'dati_insufficienti';
  observableExamples: string[];
}

export interface CefrMultiDimensions {
  listeningComprehension: CefrDimensionScore;
  grammaticalAccuracy: CefrDimensionScore;
  vocabularyRichness: CefrDimensionScore;
  spontaneousVocabulary: CefrDimensionScore;
  fluency: CefrDimensionScore;
  pronunciationIntelligibility: CefrDimensionScore;
  discourseCoherence: CefrDimensionScore;
  argumentation: CefrDimensionScore;
  interaction: CefrDimensionScore;
  complexTopics: CefrDimensionScore;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
  timestamp: number;
  wasInterrupted?: boolean;
  correction?: {
    originalSegment: string;
    correctedSegment: string;
    explanation: string;
    ruleKey: string;
  };
}

export interface UserPersonalMemory {
  id: string;
  content: string;
  category: 'interesse' | 'obiettivo' | 'progetto' | 'aneddoto';
  createdAt: number;
}

export interface StreakMilestone {
  days: number;
  title: string;
  badge: string;
  description: string;
  unlocked: boolean;
}

export interface UserLearningProfile {
  name: string;
  companionName: string;
  companionAvatar: string;
  voiceGender: 'male' | 'female';
  voiceSpeed: number; // 0.8 to 1.2
  voiceEngine: 'gemini_neural' | 'browser_voice';
  selectedBrowserVoiceUri?: string;
  micSensitivityPreset?: MicSensitivityPreset; // 'high' | 'balanced' | 'noisy_env'
  micInputGain?: number; // software amplification multiplier (e.g. 1.0 to 2.5)
  pauseToleranceMs?: number; // e.g. 3000ms for natural pauses
  correctionMode: CorrectionMode;
  conversationStyle: ConversationStyle;
  estimatedCefrLevel: CefrLevel;
  dailyGoalMinutes: number;
  todayPracticeSeconds: number;
  streakDays: number;
  longestStreakDays?: number;
  streakHistory?: string[];
  lastSessionDate: string;
  confidenceScore: number; // 0 - 100
  multiDimensions: CefrMultiDimensions;
  memories: UserPersonalMemory[];
  errors: PedagogicalError[];
  completedSessionsCount: number;
  totalSpeakingTimeSeconds: number;
  totalWordsProduced: number;
}

export interface TopicCatalogItem {
  id: string;
  category: string;
  title: string;
  description: string;
  suggestedLevel: CefrLevel;
  starterPrompt: string;
  iconName: string;
}

export interface LearningPathModule {
  id: string;
  title: string;
  description: string;
  category: string;
  targetSkill: string;
  level: CefrLevel;
  exercisesCount: number;
  completed: boolean;
  starterPrompt: string;
}
