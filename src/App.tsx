/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceState,
  UserLearningProfile,
  ConversationTurn,
  TopicCatalogItem,
  LearningPathModule,
  CorrectionMode,
  ConversationStyle,
  PedagogicalError,
  UserPersonalMemory,
  AudioDiagnosticLog,
  TurnLatencyMetrics,
} from './types';
import { PedagogicalStoreService } from './services/pedagogicalStore';
import { VoiceSessionController } from './services/voiceController';
import { Header } from './components/Header';
import { Navbar, NavigationTab } from './components/Navbar';
import { VoiceCockpit } from './components/VoiceCockpit';
import { HomeTab } from './components/HomeTab';
import { PercorsiTab } from './components/PercorsiTab';
import { ProgressiTab } from './components/ProgressiTab';
import { ProfiloTab } from './components/ProfiloTab';
import { EvaluationModal } from './components/EvaluationModal';

// Dynamic contextual pedagogical fallback when network or server is unreachable
function createClientContextualFallback(
  userText: string,
  companionName = 'Matteo',
  topicTitle = 'Conversazione libera'
) {
  const clean = (userText || '').trim();
  const snippet = clean.length > 55 ? clean.slice(0, 55) + '...' : clean;

  let replyText = '';
  if (!clean) {
    replyText = `Ciao! Sono ${companionName}. Di cosa ti piacerebbe parlare oggi? Possiamo parlare di ${topicTitle} o puoi raccontarmi come procede la tua giornata!`;
  } else if (clean.length < 18) {
    replyText = `Ti ascolto con grande interesse! Hai detto "${snippet}". Raccontami qualcosa in più in italiano: come mai?`;
  } else {
    replyText = `Che bello sentirti parlare! Quello che hai appena detto ("${snippet}") è davvero interessante. Come svilupperesti questo pensiero?`;
  }

  return {
    replyText,
    pedagogicalAnalysis: {
      hasMistake: false,
      isTranscriptionUncertain: false,
      category: 'nessuna',
      severity: 'lieve',
      originalSegment: '',
      correctedSegment: '',
      ruleKey: '',
      ruleName: '',
      explanation: '',
      example: '',
    },
    cefrObservation: {
      sessionScore: 78,
      observedFluency: 76,
      pedagogicalNote: 'Buona iniziativa comunicativa ed eloquio spontaneo.',
    },
  };
}

export default function App() {
  const store = useRef(PedagogicalStoreService.getInstance()).current;

  // App State
  const [profile, setProfile] = useState<UserLearningProfile>(() => store.getProfile());
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [stateMessage, setStateMessage] = useState<string>('Pronto');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [activeTopic, setActiveTopic] = useState<TopicCatalogItem | null>(null);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<AudioDiagnosticLog[]>([]);
  const [lastLatencyMetrics, setLastLatencyMetrics] = useState<TurnLatencyMetrics | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Stable references for state accessed by asynchronous voice handler
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const activeTopicRef = useRef(activeTopic);
  activeTopicRef.current = activeTopic;

  // Voice Controller Ref
  const voiceControllerRef = useRef<VoiceSessionController | null>(null);
  const activeSessionTimerRef = useRef<any>(null);

  // Sync profile changes from store
  const refreshProfile = useCallback(() => {
    setProfile(store.getProfile());
  }, [store]);

  // Handle final speech transcript from user
  const handleFinalSpeech = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      const currentProfile = profileRef.current;
      const currentTurns = turnsRef.current;
      const currentTopic = activeTopicRef.current;
      const startTurnId = voiceControllerRef.current?.getCurrentTurnId() || 1;

      const newUserTurn: ConversationTurn = {
        id: 'turn_' + Date.now(),
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      };

      setTurns((prev) => [...prev, newUserTurn]);
      setInterimTranscript('');

      // Update spoken stats in store
      const wordsCount = userText.trim().split(/\s+/).length;
      store.addSpeakingTime(6, wordsCount);
      refreshProfile();

      setStateMessage('Amico sta formulando la risposta...');

      try {
        const aiRequestStart = performance.now();
        const wantsNeuralTts = currentProfile.voiceEngine === 'gemini_neural';

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: userText,
            conversationHistory: currentTurns.slice(-6).map((t) => ({ role: t.role, text: t.text })),
            companionConfig: {
              name: currentProfile.companionName,
              conversationStyle: currentProfile.conversationStyle,
              correctionMode: currentProfile.correctionMode,
              voiceSpeed: currentProfile.voiceSpeed,
              voiceGender: currentProfile.voiceGender,
            },
            learnerProfile: {
              estimatedCefrLevel: currentProfile.estimatedCefrLevel,
              errors: currentProfile.errors,
              memories: currentProfile.memories,
            },
            immediateTopic: currentTopic ? currentTopic.title : 'Conversazione libera',
            generateAudio: wantsNeuralTts, // Single-roundtrip latency optimization!
          }),
        });

        let data: any;
        if (!response.ok) {
          console.warn(`[Amico] Risposta /api/chat non OK (status: ${response.status}), uso elaborazione contestuale.`);
          data = createClientContextualFallback(
            userText,
            currentProfile.companionName,
            currentTopic ? currentTopic.title : 'Conversazione libera'
          );
        } else {
          data = await response.json();
        }
        const aiRequestDuration = Math.round(performance.now() - aiRequestStart);

        // STALE RESPONSE GUARD: If user interrupted while AI was generating, drop response!
        const activeTurnId = voiceControllerRef.current?.getCurrentTurnId() || 1;
        if (startTurnId !== activeTurnId) {
          console.log(`[Amico] Risposta del turno #${startTurnId} scartata perché il turno attuale è #${activeTurnId}`);
          return;
        }

        // Check pedagogical analysis
        let correctionData = undefined;
        if (data.pedagogicalAnalysis && data.pedagogicalAnalysis.hasMistake) {
          store.registerPedagogicalAnalysis(data.pedagogicalAnalysis);
          refreshProfile();

          correctionData = {
            originalSegment: data.pedagogicalAnalysis.originalSegment || userText,
            correctedSegment: data.pedagogicalAnalysis.correctedSegment || '',
            explanation: data.pedagogicalAnalysis.explanation || '',
            ruleKey: data.pedagogicalAnalysis.ruleKey || '',
          };
        }

        const replyText =
          data.replyText ||
          createClientContextualFallback(
            userText,
            currentProfile.companionName,
            currentTopic ? currentTopic.title : 'Conversazione libera'
          ).replyText;

        const newModelTurn: ConversationTurn = {
          id: 'turn_' + Date.now(),
          role: 'model',
          text: replyText,
          timestamp: Date.now(),
          correction: correctionData,
        };

        setTurns((prev) => [...prev, newModelTurn]);

        // Speak response out loud in Italian exclusively
        if (voiceControllerRef.current) {
          await voiceControllerRef.current.speak(replyText, {
            voiceEngine: currentProfile.voiceEngine,
            voiceGender: currentProfile.voiceGender,
            ttsAudioBase64: data.audioBase64,
            turnId: startTurnId,
          });
        }
      } catch (err: any) {
        console.log('[Amico] Continuità conversazione preservata:', err?.message || err);
        setStateMessage('Ti ascolto con grande interesse...');
        const fallback = createClientContextualFallback(
          userText,
          currentProfile.companionName,
          currentTopic ? currentTopic.title : 'Conversazione libera'
        );
        const fallbackTurn: ConversationTurn = {
          id: 'turn_' + Date.now(),
          role: 'model',
          text: fallback.replyText,
          timestamp: Date.now(),
        };
        setTurns((prev) => [...prev, fallbackTurn]);
        if (voiceControllerRef.current) {
          await voiceControllerRef.current.speak(fallbackTurn.text, {
            voiceEngine: currentProfile.voiceEngine,
            voiceGender: currentProfile.voiceGender,
            turnId: startTurnId,
          });
        }
      }
    },
    [store, refreshProfile]
  );

  const handleFinalSpeechRef = useRef(handleFinalSpeech);
  handleFinalSpeechRef.current = handleFinalSpeech;

  // Initialize Voice Controller ONCE on mount
  useEffect(() => {
    const controller = new VoiceSessionController(
      {
        onStateChange: (newState, message) => {
          setVoiceState(newState);
          if (message) setStateMessage(message);
        },
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
        },
        onFinalTranscript: (text) => {
          handleFinalSpeechRef.current(text);
        },
        onVolumeChange: (vol) => {
          setMicVolume(vol);
        },
        onVoiceActivity: (isActive) => {
          setIsVoiceActive(isActive);
        },
        onAssistantSpeechStart: () => {},
        onAssistantSpeechEnd: () => {},
        onError: (errText) => {
          setStateMessage(errText);
        },
        onDiagnosticLog: (log) => {
          setDiagnosticLogs((prev) => [log, ...prev.slice(0, 49)]);
        },
        onLatencyMetric: (metrics) => {
          setLastLatencyMetrics(metrics);
        },
        onReconnecting: (reconnecting, msg) => {
          setIsReconnecting(reconnecting);
          if (reconnecting && msg) {
            setStateMessage(msg);
          }
        },
      },
      {
        voiceEngine: profileRef.current.voiceEngine,
        voiceGender: profileRef.current.voiceGender,
        voiceSpeed: profileRef.current.voiceSpeed,
        silenceThresholdMs: profileRef.current.pauseToleranceMs || 3000,
        micSensitivityPreset: profileRef.current.micSensitivityPreset || 'high',
        micInputGain: profileRef.current.micInputGain || 1.4,
      }
    );

    voiceControllerRef.current = controller;

    return () => {
      controller.stopSession();
    };
  }, []); // Run ONCE on mount - NEVER tear down the session on re-renders!

  // Keep controller config synchronized with profile updates without recreating the session
  useEffect(() => {
    voiceControllerRef.current?.updateConfig({
      voiceEngine: profile.voiceEngine,
      voiceGender: profile.voiceGender,
      voiceSpeed: profile.voiceSpeed,
      silenceThresholdMs: profile.pauseToleranceMs || 3000,
      micSensitivityPreset: profile.micSensitivityPreset || 'high',
      micInputGain: profile.micInputGain || 1.4,
    });
  }, [
    profile.voiceEngine,
    profile.voiceGender,
    profile.voiceSpeed,
    profile.pauseToleranceMs,
    profile.micSensitivityPreset,
    profile.micInputGain,
  ]);

  // Session timer tracking (accumulates without tearing down session)
  useEffect(() => {
    if (voiceState === 'LISTENING' || voiceState === 'SPEAKING') {
      activeSessionTimerRef.current = setInterval(() => {
        store.addSpeakingTime(1);
      }, 1000);
    } else {
      if (activeSessionTimerRef.current) {
        clearInterval(activeSessionTimerRef.current);
        activeSessionTimerRef.current = null;
      }
      refreshProfile();
    }

    return () => {
      if (activeSessionTimerRef.current) {
        clearInterval(activeSessionTimerRef.current);
      }
    };
  }, [voiceState, store, refreshProfile]);

  // Start voice session
  const handleStartSession = async () => {
    setCurrentTab('parla');
    if (voiceControllerRef.current) {
      await voiceControllerRef.current.startSession();
    }
  };

  // Stop voice session
  const handleStopSession = () => {
    if (voiceControllerRef.current) {
      voiceControllerRef.current.stopSession();
    }
    setStateMessage('Sessione terminata.');
  };

  // Instant Interruption (Barge-in)
  const handleInterrupt = () => {
    if (voiceControllerRef.current) {
      voiceControllerRef.current.interrupt();
    }
  };

  // Immediate send without waiting for silence timer
  const handleForceFinalize = () => {
    if (voiceControllerRef.current) {
      voiceControllerRef.current.forceFinalizeTurn();
    }
  };

  // Start with specific topic
  const handleStartWithTopic = (topic: TopicCatalogItem | null) => {
    setActiveTopic(topic);
    setCurrentTab('parla');
    if (topic) {
      // Seed first model message
      const starterTurn: ConversationTurn = {
        id: 'starter_' + Date.now(),
        role: 'model',
        text: topic.starterPrompt,
        timestamp: Date.now(),
      };
      setTurns([starterTurn]);
      handleStartSession().then(() => {
        voiceControllerRef.current?.speak(topic.starterPrompt, {
          voiceEngine: profile.voiceEngine,
          voiceGender: profile.voiceGender,
        });
      });
    } else {
      handleStartSession();
    }
  };

  // Start specialized learning path
  const handleStartPath = (path: LearningPathModule) => {
    setCurrentTab('parla');
    const starterTurn: ConversationTurn = {
      id: 'starter_' + Date.now(),
      role: 'model',
      text: path.starterPrompt,
      timestamp: Date.now(),
    };
    setTurns([starterTurn]);
    handleStartSession().then(() => {
      voiceControllerRef.current?.speak(path.starterPrompt, {
        voiceEngine: profile.voiceEngine,
        voiceGender: profile.voiceGender,
      });
    });
  };

  // Promote Error Status
  const handlePromoteErrorStatus = (errorId: string, success: boolean) => {
    store.promoteErrorStatus(errorId, success);
    refreshProfile();
  };

  // Update profile
  const handleUpdateProfile = (updates: Partial<UserLearningProfile>) => {
    store.updateProfile(updates);
    refreshProfile();
  };

  // Memory management
  const handleAddMemory = (content: string, category: UserPersonalMemory['category']) => {
    store.addMemory(content, category);
    refreshProfile();
  };

  const handleDeleteMemory = (id: string) => {
    store.deleteMemory(id);
    refreshProfile();
  };

  // Export data
  const handleExportData = () => {
    const dataStr = store.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amico_dati_apprendimento_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Wipe data
  const handleWipeData = async () => {
    await store.wipeAllData();
    refreshProfile();
    setTurns([]);
    handleStopSession();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased">
      {/* Universal Header */}
      <Header
        profile={profile}
        voiceState={voiceState}
        onOpenVoice={() => setCurrentTab('parla')}
      />

      {/* Main Tab Screen */}
      <main className="flex-1 overflow-x-hidden">
        {currentTab === 'home' && (
          <HomeTab
            profile={profile}
            onStartVoiceWithTopic={handleStartWithTopic}
            onPromoteStatus={handlePromoteErrorStatus}
            onGoToPercorsi={() => setCurrentTab('percorso')}
            onGoToProgressi={() => setCurrentTab('progressi')}
          />
        )}

        {currentTab === 'parla' && (
          <VoiceCockpit
            profile={profile}
            voiceState={voiceState}
            stateMessage={stateMessage}
            interimTranscript={interimTranscript}
            turns={turns}
            micVolume={micVolume}
            isVoiceActive={isVoiceActive}
            activeTopic={activeTopic}
            diagnosticLogs={diagnosticLogs}
            hardwareMicState={voiceControllerRef.current?.getHardwareMicState() || 'inactive'}
            isRecognitionActive={voiceControllerRef.current?.isRecognitionRunning() || false}
            lastLatencyMetrics={lastLatencyMetrics}
            isReconnecting={isReconnecting}
            onSelectTopic={(t) => setActiveTopic(t)}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onInterrupt={handleInterrupt}
            onSendTextMessage={handleFinalSpeech}
            onUpdateCorrectionMode={(m) => handleUpdateProfile({ correctionMode: m })}
            onUpdateStyle={(s) => handleUpdateProfile({ conversationStyle: s })}
            onOpenEvaluation={() => setIsEvaluationOpen(true)}
            onForceFinalize={handleForceFinalize}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentTab === 'percorso' && (
          <PercorsiTab
            profile={profile}
            onStartPath={handleStartPath}
            onStartTopic={handleStartWithTopic}
          />
        )}

        {currentTab === 'progressi' && (
          <ProgressiTab
            profile={profile}
            onPromoteErrorStatus={handlePromoteErrorStatus}
            onPracticeError={(err) => handleStartWithTopic(null)}
            onRunCefrAssessment={() => setIsEvaluationOpen(true)}
          />
        )}

        {currentTab === 'profilo' && (
          <ProfiloTab
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onExportData={handleExportData}
            onWipeData={handleWipeData}
          />
        )}
      </main>

      {/* In-depth CEFR Evaluation Modal */}
      <EvaluationModal
        isOpen={isEvaluationOpen}
        turns={turns}
        profile={profile}
        onClose={() => setIsEvaluationOpen(false)}
        onApplyEvaluation={(evalData) => {
          store.updateCefrScores(evalData);
          refreshProfile();
        }}
      />

      {/* Bottom Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        isVoiceActive={voiceState !== 'IDLE' && voiceState !== 'ERROR'}
      />
    </div>
  );
}
