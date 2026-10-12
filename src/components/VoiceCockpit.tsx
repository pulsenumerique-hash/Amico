/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  VoiceState,
  UserLearningProfile,
  ConversationTurn,
  TopicCatalogItem,
  CorrectionMode,
  ConversationStyle,
  AudioDiagnosticLog,
  TurnLatencyMetrics,
} from '../types';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  Settings2,
  Send,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  Activity,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { TOPIC_CATALOG } from '../data/curriculum';

interface VoiceCockpitProps {
  profile: UserLearningProfile;
  voiceState: VoiceState;
  stateMessage?: string;
  interimTranscript: string;
  turns: ConversationTurn[];
  micVolume: number;
  isVoiceActive?: boolean;
  activeTopic: TopicCatalogItem | null;
  diagnosticLogs?: AudioDiagnosticLog[];
  hardwareMicState?: 'live' | 'muted' | 'ended' | 'inactive';
  isRecognitionActive?: boolean;
  lastLatencyMetrics?: TurnLatencyMetrics | null;
  isReconnecting?: boolean;
  onSelectTopic: (topic: TopicCatalogItem | null) => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onInterrupt: () => void;
  onSendTextMessage: (text: string) => void;
  onUpdateCorrectionMode: (mode: CorrectionMode) => void;
  onUpdateStyle: (style: ConversationStyle) => void;
  onOpenEvaluation: () => void;
  onForceFinalize?: () => void;
  onUpdateProfile?: (updates: Partial<UserLearningProfile>) => void;
}

export const VoiceCockpit: React.FC<VoiceCockpitProps> = ({
  profile,
  voiceState,
  stateMessage,
  interimTranscript,
  turns,
  micVolume,
  isVoiceActive = false,
  activeTopic,
  diagnosticLogs = [],
  hardwareMicState = 'inactive',
  isRecognitionActive = false,
  lastLatencyMetrics = null,
  isReconnecting = false,
  onSelectTopic,
  onStartSession,
  onStopSession,
  onInterrupt,
  onSendTextMessage,
  onUpdateCorrectionMode,
  onUpdateStyle,
  onOpenEvaluation,
  onForceFinalize,
  onUpdateProfile,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTopicDrawer, setShowTopicDrawer] = useState(false);
  const [showModeSettings, setShowModeSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const turnsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, interimTranscript]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendTextMessage(textInput.trim());
    setTextInput('');
  };

  const isSpeaking = voiceState === 'SPEAKING';
  const isListening = voiceState === 'LISTENING';
  const isProcessing = voiceState === 'PROCESSING';
  const isInterrupted = voiceState === 'INTERRUPTING';
  const isError = voiceState === 'ERROR';
  const isSessionActive = voiceState !== 'IDLE' && voiceState !== 'ERROR';

  const stateBadge = isListening
    ? { primary: "Je t'écoute", italian: 'Ti ascolto', color: 'text-emerald-300' }
    : isProcessing
    ? { primary: 'Je réfléchis...', italian: 'Sto riflettendo', color: 'text-blue-300' }
    : isSpeaking
    ? { primary: 'Je parle', italian: 'Sto parlando', color: 'text-emerald-300' }
    : isInterrupted
    ? { primary: 'Interrompu', italian: 'Interrotto', color: 'text-rose-300' }
    : isError
    ? { primary: 'Erreur micro', italian: 'Errore', color: 'text-rose-400' }
    : { primary: 'Prêt', italian: 'Pronto', color: 'text-stone-300' };

  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-md mx-auto px-4 pt-2 pb-2">
      {/* Top Cockpit Controls & Topic Banner */}
      <div className="bg-stone-800/90 border border-stone-700/80 rounded-2xl p-3 mb-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Active Topic Trigger */}
          <button
            onClick={() => setShowTopicDrawer(!showTopicDrawer)}
            className="flex items-center space-x-2 text-left group overflow-hidden max-w-[200px]"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                Tema Attivo
              </span>
              <span className="text-xs font-semibold text-stone-200 truncate block group-hover:text-emerald-300 transition-colors">
                {activeTopic ? activeTopic.title : 'Conversazione libera'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          </button>

          {/* Quick Config Button & Reconnecting status */}
          <div className="flex items-center space-x-1.5">
            {isReconnecting && (
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Reconnexion…</span>
              </div>
            )}

            <button
              onClick={() => setShowModeSettings(!showModeSettings)}
              className="p-1.5 rounded-lg bg-stone-700/60 hover:bg-stone-700 text-stone-300 text-xs flex items-center space-x-1 transition-colors"
              title="Modalità e stile"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="capitalize text-[11px] font-medium hidden sm:inline">
                {profile.correctionMode}
              </span>
            </button>

            {turns.length >= 2 && (
              <button
                onClick={onOpenEvaluation}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
              >
                Valuta ora
              </button>
            )}
          </div>
        </div>

        {/* Topic Selector Drawer */}
        {showTopicDrawer && (
          <div className="mt-3 pt-3 border-t border-stone-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-300">Scegli un argomento:</span>
              <button
                onClick={() => {
                  onSelectTopic(null);
                  setShowTopicDrawer(false);
                }}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Parla liberamente
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {TOPIC_CATALOG.slice(0, 8).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    onSelectTopic(topic);
                    setShowTopicDrawer(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    activeTopic?.id === topic.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-900/60 hover:bg-stone-700/50 text-stone-300'
                  }`}
                >
                  <span className="font-medium truncate mr-2">{topic.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 shrink-0">
                    {topic.suggestedLevel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Correction Mode Settings Drawer */}
        {showModeSettings && (
          <div className="mt-3 pt-3 border-t border-stone-700/60 text-xs space-y-3">
            <div>
              <span className="text-stone-400 font-semibold block mb-1">Rigorosità Correzione:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['light', 'targeted', 'deep'] as CorrectionMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      onUpdateCorrectionMode(mode);
                      setShowModeSettings(false);
                    }}
                    className={`p-2 rounded-xl text-center capitalize font-medium transition-all ${
                      profile.correctionMode === mode
                        ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                        : 'bg-stone-900/80 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {mode === 'light' ? 'Leggera' : mode === 'targeted' ? 'Mirata' : 'Approfondita'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-stone-400 font-semibold block mb-1">Stile Conversazione:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['amico', 'professore', 'dibattito'] as ConversationStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateStyle(st);
                      setShowModeSettings(false);
                    }}
                    className={`p-2 rounded-xl text-center capitalize font-medium transition-all ${
                      profile.conversationStyle === st
                        ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                        : 'bg-stone-900/80 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Sensitivity Configuration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-stone-300 font-semibold block">Sensibilità Microfono:</span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {(profile.micSensitivityPreset || 'high') === 'high'
                    ? 'Alta (Voce dolce / silenzio)'
                    : profile.micSensitivityPreset === 'noisy_env'
                    ? 'Filtro Rumore'
                    : 'Bilanciata'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    id: 'high' as const,
                    label: 'Alta',
                    sub: 'Consigliata',
                    desc: 'Cattura voce dolce & sussurri',
                  },
                  {
                    id: 'balanced' as const,
                    label: 'Bilanciata',
                    sub: 'Standard',
                    desc: 'Per ambienti normali',
                  },
                  {
                    id: 'noisy_env' as const,
                    label: 'Filtro Rumore',
                    sub: 'Attivo',
                    desc: 'Per luoghi rumorosi',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onUpdateProfile?.({ micSensitivityPreset: item.id })}
                    className={`p-2 rounded-xl text-left transition-all ${
                      (profile.micSensitivityPreset || 'high') === item.id
                        ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm ring-1 ring-emerald-300'
                        : 'bg-stone-900/80 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold leading-none">{item.label}</span>
                      <span className="text-[9px] font-normal opacity-75">{item.sub}</span>
                    </div>
                    <span className="text-[9px] block opacity-85 mt-1 leading-tight font-normal">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pause tolerance configuration */}
            <div>
              <span className="text-stone-400 font-semibold block mb-1">
                Tolleranza Pause Vocali (Tempo per riflettere):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Rapida (2.2s)', val: 2200 },
                  { label: 'Naturale (3.0s)', val: 3000 },
                  { label: 'Ampia (4.0s)', val: 4000 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => {
                      onUpdateProfile?.({ pauseToleranceMs: item.val });
                    }}
                    className={`p-2 rounded-xl text-center text-[11px] font-medium transition-all ${
                      (profile.pauseToleranceMs || 3000) === item.val
                        ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                        : 'bg-stone-900/80 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Conversation Canvas: Live Subtitles and Turns */}
      <div className="flex-1 overflow-y-auto px-1 space-y-3 mb-3 pr-1 custom-scrollbar">
        {turns.length === 0 && !interimTranscript && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <div className="w-20 h-20 rounded-full bg-stone-800/80 border border-stone-700 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
              <Mic className="w-9 h-9 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-semibold text-stone-200 mb-1">
              Pronto a parlare italiano?
            </h3>
            <p className="text-xs text-stone-400 max-w-xs leading-relaxed mb-4">
              Premi il microfono grande sotto e inizia a parlare. {profile.companionName} ti ascolta, ti risponde a voce e puoi interromperlo quando vuoi!
            </p>
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-left w-full text-xs space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Suggerimento per iniziare:
              </span>
              <p className="italic text-stone-300">
                «Ciao {profile.companionName}, oggi ho fatto una bella passeggiata e vorrei raccontarti com’è andata...»
              </p>
            </div>
          </div>
        )}

        {/* Message Turns */}
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex flex-col ${
              turn.role === 'user' ? 'items-end' : 'items-start'
            } space-y-1`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                turn.role === 'user'
                  ? 'bg-emerald-600 text-stone-950 font-medium rounded-br-xs shadow-md'
                  : 'bg-stone-800 text-stone-100 rounded-bl-xs border border-stone-700/70 shadow-sm'
              }`}
            >
              <p>{turn.text}</p>

              {turn.wasInterrupted && (
                <span className="inline-block mt-1 text-[10px] font-semibold text-amber-300/90 italic">
                  [Interrotto da te]
                </span>
              )}
            </div>

            {/* If model has a dedicated pedagogical recast */}
            {turn.correction && (
              <div className="max-w-[88%] bg-stone-900/90 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-300 shadow-sm">
                <div className="flex items-center space-x-1.5 font-semibold text-emerald-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consiglio di naturalezza</span>
                </div>
                <p className="text-stone-300 text-[11px] mb-1">
                  Invece di <span className="line-through text-rose-400/80">"{turn.correction.originalSegment}"</span>, diciamo più naturalmente:{' '}
                  <span className="font-semibold text-emerald-300">"{turn.correction.correctedSegment}"</span>.
                </p>
                <p className="text-[11px] text-stone-400">{turn.correction.explanation}</p>
              </div>
            )}
          </div>
        ))}

        {/* Live Speaking Transcript / Continuous Speech Bubble */}
        {interimTranscript && (
          <div className="flex flex-col items-end space-y-1">
            <div className="max-w-[88%] p-3.5 rounded-2xl rounded-br-xs bg-emerald-950/70 text-emerald-100 border border-emerald-500/50 text-xs sm:text-sm shadow-lg backdrop-blur-sm">
              <p className="leading-relaxed font-normal">{interimTranscript}</p>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-emerald-500/20 text-[10px]">
                <span className="text-emerald-300 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>In ascolto • Le tue pause sono preservate</span>
                </span>
                {onForceFinalize && (
                  <button
                    type="button"
                    onClick={onForceFinalize}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                    title="Invia subito ad Amico senza attendere il timer di pausa"
                  >
                    <span>Invia ora</span>
                    <Send className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <span className="text-[10px] text-stone-400">Trascrizione integrale continua (parla liberamente)</span>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-stone-300 text-xs bg-stone-800/80 border border-blue-500/40 w-fit px-3 py-1.5 rounded-full animate-pulse shadow-md">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-medium">Je réfléchis... (Sto riflettendo)</span>
          </div>
        )}

        <div ref={turnsEndRef} />
      </div>

      {/* Voice Cockpit Central Controller */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-4 shadow-xl relative backdrop-blur-md">
        {/* Error Alert with actionable guidance */}
        {isError && (
          <div className="mb-3 p-3 bg-rose-950/80 border border-rose-600/50 rounded-2xl text-xs text-rose-200 flex items-start space-x-2.5 shadow-lg">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-rose-200">
                {stateMessage || 'Erreur d’accès au microphone'}
              </p>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                Cliquez sur l'icône de cadenas dans la barre d'adresse du navigateur pour autoriser le micro, puis cliquez sur <strong>Commencer</strong>.
              </p>
              <button
                type="button"
                onClick={onStartSession}
                className="mt-1 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold text-xs transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Status Text and Visualizer Bars */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSpeaking
                  ? 'bg-emerald-400 animate-pulse'
                  : isListening
                  ? isVoiceActive || micVolume > 6
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                  : isProcessing
                  ? 'bg-blue-400 animate-pulse'
                  : isInterrupted
                  ? 'bg-rose-400'
                  : 'bg-stone-600'
              }`}
            />
            <div className="flex items-center space-x-1.5">
              <span className={`text-xs font-bold ${stateBadge.color}`}>
                {stateBadge.primary}
              </span>
              <span className="text-[10px] text-stone-400 font-medium">
                ({stateBadge.italian})
              </span>
              {isReconnecting && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-semibold flex items-center space-x-1 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Reconnexion silencieuse…</span>
                </span>
              )}
              {isListening && !isReconnecting && (isVoiceActive || micVolume >= 6) && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold animate-pulse">
                  {micVolume < 18 ? 'Voce dolce rilevata' : 'Voce attiva'}
                </span>
              )}
            </div>
          </div>

          {/* Voice Waveform animation indicator & Diagnostic Toggle */}
          <div className="flex items-center space-x-2">
            {isSessionActive && (
              <div className="flex items-center space-x-1 h-4">
                {[30, 70, 100, 60, 85, 45, 90].map((h, i) => {
                  const dynamicHeight = isListening
                    ? Math.max(
                        3,
                        Math.min(
                          16,
                          ((micVolume + (isVoiceActive ? 15 : 0)) / 100) * 16 * (1 + (i % 3) * 0.35)
                        )
                      )
                    : isSpeaking
                    ? Math.max(4, Math.min(16, (h / 100) * 16))
                    : 3;
                  return (
                    <span
                      key={i}
                      style={{ height: `${dynamicHeight}px` }}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isSpeaking
                          ? 'bg-emerald-400'
                          : isListening
                          ? isVoiceActive || micVolume > 6
                            ? 'bg-emerald-400'
                            : 'bg-amber-400/80'
                          : 'bg-stone-700'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* Discrete Diagnostic Toggle */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`p-1 rounded-md text-[10px] font-mono flex items-center space-x-1 transition-colors ${
                showDiagnostics
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-300 border border-stone-700/60'
              }`}
              title="Diagnostica audio in tempo reale"
            >
              <Activity className="w-3 h-3" />
              <span className="hidden sm:inline">Info</span>
            </button>
          </div>
        </div>

        {/* Real-time Hardware & Engine Status Bar with Sensitive VU-Meter */}
        {isSessionActive && (
          <div className="px-2.5 py-1.5 mb-2 bg-stone-950/50 rounded-xl border border-stone-800/80 text-[10px] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hardwareMicState === 'live'
                        ? 'bg-emerald-400'
                        : hardwareMicState === 'muted'
                        ? 'bg-amber-400'
                        : 'bg-stone-500'
                    }`}
                  />
                  <span className="text-stone-400">Microfono:</span>
                  <strong
                    className={hardwareMicState === 'live' ? 'text-emerald-400' : 'text-stone-300'}
                  >
                    {hardwareMicState === 'live' ? 'Attivo' : hardwareMicState}
                  </strong>
                </span>

                <span className="flex items-center space-x-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecognitionActive
                        ? 'bg-emerald-400 animate-pulse'
                        : isSpeaking
                        ? 'bg-blue-400'
                        : 'bg-stone-500'
                    }`}
                  />
                  <span className="text-stone-400">Riconoscimento:</span>
                  <strong className={isRecognitionActive ? 'text-emerald-400' : 'text-stone-300'}>
                    {isRecognitionActive ? 'In ascolto (it-IT)' : isSpeaking ? 'Voce Amico' : 'Pronto'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center space-x-2 font-mono">
                {lastLatencyMetrics && lastLatencyMetrics.totalLatencyMs > 0 && (
                  <span
                    className="text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                    title={`Latenza totale: ${lastLatencyMetrics.totalLatencyMs}ms (IA: ${lastLatencyMetrics.aiDurationMs}ms)`}
                  >
                    ⚡ {lastLatencyMetrics.totalLatencyMs}ms
                  </span>
                )}
                <span
                  className={`font-semibold ${
                    isVoiceActive || micVolume > 6 ? 'text-emerald-400' : 'text-stone-400'
                  }`}
                >
                  Segnale: {micVolume}%
                </span>
              </div>
            </div>

            {/* Live Sensitive VU-Meter Bar */}
            {isListening && (
              <div className="flex items-center space-x-2 pt-0.5">
                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(3, micVolume))}%` }}
                    className={`h-full transition-all duration-75 rounded-full ${
                      isVoiceActive || micVolume >= 12
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : micVolume > 3
                        ? 'bg-amber-400'
                        : 'bg-stone-700'
                    }`}
                  />
                </div>
                <span className="text-[9px] text-stone-400 font-sans shrink-0">
                  {(profile.micSensitivityPreset || 'high') === 'high'
                    ? 'Sensibilità: Alta'
                    : profile.micSensitivityPreset === 'noisy_env'
                    ? 'Sensibilità: Filtro Rumore'
                    : 'Sensibilità: Bilanciata'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Realtime Diagnostic Logs Drawer */}
        {showDiagnostics && (
          <div className="mb-3 p-2.5 bg-stone-950/90 border border-stone-800 rounded-xl text-[10px] font-mono space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between text-stone-400 font-bold pb-1 border-b border-stone-800">
              <span className="flex items-center space-x-1">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Registro Eventi Microfono & Riconoscimento</span>
              </span>
              <span>{diagnosticLogs.length} eventi</span>
            </div>

            {diagnosticLogs.length === 0 ? (
              <p className="text-stone-500 italic">In attesa di eventi audio...</p>
            ) : (
              diagnosticLogs.slice(0, 15).map((log, i) => (
                <div key={i} className="flex items-start space-x-1.5 leading-tight">
                  <span className="text-stone-500 shrink-0">{log.timestamp}</span>
                  <span
                    className={`font-semibold shrink-0 px-1 rounded ${
                      log.type === 'USER_START' || log.type === 'REC_START' || log.type === 'TRACK_START'
                        ? 'bg-emerald-950 text-emerald-300'
                        : log.type === 'REC_ERROR'
                        ? 'bg-rose-950 text-rose-300'
                        : log.type === 'REC_RESULT'
                        ? 'bg-blue-950 text-blue-300'
                        : log.type === 'RESTART_ATTEMPT'
                        ? 'bg-amber-950 text-amber-300'
                        : 'text-stone-400'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="text-stone-300 break-words">{log.details}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Central Controls: Big Mic Button & Barge-in Interruption Button */}
        <div className="flex items-center justify-around py-1">
          {/* Text input toggle */}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className={`p-3 rounded-full border transition-all active:scale-95 ${
              showTextInput
                ? 'bg-stone-700 text-stone-100 border-stone-600'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700'
            }`}
            title="Scrivi invece di parlare"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Primary Voice Action Button */}
          {!isSessionActive ? (
            <button
              onClick={onStartSession}
              className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-stone-950 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 transition-all focus:outline-none"
              aria-label="Commencer la conversation vocale"
            >
              <Mic className="w-9 h-9 stroke-[2.2] group-hover:scale-110 transition-transform" />
              <span className="absolute -bottom-6 text-[11px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                Commencer
              </span>
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              {/* Stop Session Button */}
              <button
                onClick={onStopSession}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-stone-800 text-rose-400 hover:bg-stone-700 border border-stone-700 shadow-md active:scale-95 transition-all"
                title="Terminer la session"
              >
                <Square className="w-5 h-5 fill-rose-400" />
              </button>

              {/* Crucial: Barge-in Interrupt Button */}
              {isSpeaking ? (
                <button
                  onClick={onInterrupt}
                  className="flex items-center space-x-2 px-5 py-3 rounded-full bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold text-xs shadow-lg shadow-rose-500/30 active:scale-95 transition-all animate-pulse"
                  title="Interrompre Amico immédiatement"
                >
                  <VolumeX className="w-4 h-4 stroke-[2.5]" />
                  <span>Je parle • Interrompre</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Je t'écoute...</span>
                </div>
              )}
            </div>
          )}

          {/* Evaluation Trigger / End of turn summary */}
          <button
            onClick={onOpenEvaluation}
            className="p-3 rounded-full bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700 active:scale-95 transition-all"
            title="Riepilogo e Valutazione"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input Row (if user opts to type or fallback) */}
        {showTextInput && (
          <form onSubmit={handleTextSubmit} className="mt-3 pt-3 border-t border-stone-800 flex items-center space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Scrivi qui la tua frase in italiano..."
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2 rounded-xl bg-emerald-500 text-stone-950 disabled:opacity-50 disabled:hover:bg-emerald-500 hover:bg-emerald-400 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
