/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserLearningProfile, ErrorLearningStatus, PedagogicalError } from '../types';
import {
  BarChart3,
  Award,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  Filter,
} from 'lucide-react';
import { PedagogicalCorrectionCard } from './PedagogicalCorrectionCard';

interface ProgressiTabProps {
  profile: UserLearningProfile;
  onPromoteErrorStatus: (errorId: string, success: boolean) => void;
  onPracticeError: (error: PedagogicalError) => void;
  onRunCefrAssessment: () => void;
}

export const ProgressiTab: React.FC<ProgressiTabProps> = ({
  profile,
  onPromoteErrorStatus,
  onPracticeError,
  onRunCefrAssessment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'competenze' | 'errori'>('competenze');
  const [errorStatusFilter, setErrorStatusFilter] = useState<string>('tutti');

  const dimensionsList = [
    { key: 'listeningComprehension', label: 'Comprensione Orale' },
    { key: 'grammaticalAccuracy', label: 'Accuratezza Grammaticale' },
    { key: 'vocabularyRichness', label: 'Ricchezza Lessicale' },
    { key: 'spontaneousVocabulary', label: 'Vocabolario Spontaneo' },
    { key: 'fluency', label: 'Fluidità e Continuità' },
    { key: 'pronunciationIntelligibility', label: 'Pronuncia & Intelligibilità' },
    { key: 'discourseCoherence', label: 'Coerenza del Discorso' },
    { key: 'argumentation', label: 'Argomentazione & Ragionamento' },
    { key: 'interaction', label: 'Interazione & Turni di Parola' },
    { key: 'complexTopics', label: 'Trattazione Temi Astratti' },
  ];

  const filteredErrors = profile.errors.filter((err) => {
    if (errorStatusFilter === 'tutti') return true;
    return err.status === errorStatusFilter;
  });

  const masteredCount = profile.errors.filter((e) => e.status === 'padroneggiata').length;
  const learningCount = profile.errors.filter((e) => e.status === 'in_apprendimento' || e.status === 'da_ripassare').length;

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* CEFR Level Overview Card */}
      <div className="bg-stone-800/80 border border-stone-700/80 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Quadro Comune Europeo (CECRL)
            </span>
            <h2 className="text-lg font-bold text-stone-100">
              Valutazione Multidimensionale
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center">
            <span className="text-base font-extrabold text-emerald-400">
              {profile.estimatedCefrLevel}
            </span>
            <span className="text-[9px] text-stone-400 uppercase font-bold">Stima</span>
          </div>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed mb-4">
          Il tuo livello è calcolato su 10 dimensioni distinte e si basa su osservazioni effettive, non su ipotesi arbitrarie o test a crocette.
        </p>

        {/* Global Confidence & Sessions */}
        <div className="grid grid-cols-2 gap-2 bg-stone-900/60 p-3 rounded-2xl border border-stone-800 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 block">Grado di confidenza:</span>
            <span className="font-semibold text-emerald-400">{profile.confidenceScore}% (Buona affidabilità)</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block">Tempo totale parlato:</span>
            <span className="font-semibold text-stone-200">
              {Math.round(profile.totalSpeakingTimeSeconds / 60)} min ({profile.totalWordsProduced} parole)
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs: 10 Competenze vs Quaderno Errori */}
      <div className="bg-stone-800/80 p-1 rounded-2xl border border-stone-700/80 flex items-center">
        <button
          onClick={() => setActiveSubTab('competenze')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'competenze'
              ? 'bg-emerald-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          10 Competenze CECRL
        </button>
        <button
          onClick={() => setActiveSubTab('errori')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'errori'
              ? 'bg-emerald-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Quaderno Errori ({profile.errors.length})
        </button>
      </div>

      {/* View 1: 10 Competencies */}
      {activeSubTab === 'competenze' && (
        <div className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300">
              Indicatori Descrittivi
            </span>
            <span className="text-[11px] text-stone-400">Aggiornato in tempo reale</span>
          </div>

          <div className="space-y-2.5">
            {dimensionsList.map((item) => {
              const data = (profile.multiDimensions as any)[item.key] || {
                score: 50,
                estimatedLevel: 'A2',
                confidence: 60,
                recentTrend: 'stabile',
                observableExamples: [],
              };

              return (
                <div
                  key={item.key}
                  className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-200">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-700 text-stone-300">
                        {data.estimatedLevel}
                      </span>
                      <span className="font-bold text-emerald-400">{data.score}/100</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${data.score}%` }}
                    />
                  </div>

                  {/* Observable notes */}
                  {data.observableExamples && data.observableExamples.length > 0 && (
                    <p className="text-[11px] text-stone-400 italic">
                      Osservazione: {data.observableExamples[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Error Notebook & Spaced Repetition */}
      {activeSubTab === 'errori' && (
        <div className="space-y-3">
          {/* Status Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'tutti', label: 'Tutti' },
              { id: 'in_apprendimento', label: 'In Apprendimento' },
              { id: 'in_consolidamento', label: 'In Consolidamento' },
              { id: 'padroneggiata', label: 'Padroneggiata' },
              { id: 'da_ripassare', label: 'Da Ripassare' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setErrorStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                  errorStatusFilter === st.id
                    ? 'bg-emerald-500 text-stone-950 font-semibold'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Quick Counter */}
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>
              {masteredCount} regole padroneggiate su {profile.errors.length}
            </span>
            <span>{learningCount} attive in revisione</span>
          </div>

          {/* Errors list */}
          {filteredErrors.length === 0 ? (
            <div className="bg-stone-800/40 border border-stone-700/40 rounded-2xl p-6 text-center text-xs text-stone-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p>Nessun errore corrisponde a questo filtro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => (
                <PedagogicalCorrectionCard
                  key={error.id}
                  error={error}
                  onPromoteStatus={onPromoteErrorStatus}
                  onPracticeNow={onPracticeError}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
