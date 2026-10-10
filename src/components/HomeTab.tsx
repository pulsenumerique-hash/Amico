/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserLearningProfile, TopicCatalogItem, PedagogicalError } from '../types';
import {
  Mic,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Award,
  Compass,
} from 'lucide-react';
import { TOPIC_CATALOG } from '../data/curriculum';
import { PedagogicalCorrectionCard } from './PedagogicalCorrectionCard';
import { DailyStreakCounter } from './DailyStreakCounter';
import { VisualStreakCalendar } from './VisualStreakCalendar';

interface HomeTabProps {
  profile: UserLearningProfile;
  onStartVoiceWithTopic: (topic: TopicCatalogItem | null) => void;
  onPromoteStatus: (errorId: string, success: boolean) => void;
  onGoToPercorsi: () => void;
  onGoToProgressi: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile,
  onStartVoiceWithTopic,
  onPromoteStatus,
  onGoToPercorsi,
  onGoToProgressi,
}) => {
  const goalSeconds = profile.dailyGoalMinutes * 60;
  const progressPercent = Math.min(100, Math.round((profile.todayPracticeSeconds / goalSeconds) * 100));
  const minutesToday = Math.floor(profile.todayPracticeSeconds / 60);

  // Pick daily suggested topic based on level
  const suggestedTopic =
    TOPIC_CATALOG.find((t) => t.suggestedLevel === profile.estimatedCefrLevel) ||
    TOPIC_CATALOG[0];

  // Error needing review
  const errorNeedingReview = profile.errors.find(
    (e) => e.status === 'da_ripassare' || e.status === 'in_apprendimento'
  );

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700/80 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Bentornato!
            </span>
            <h2 className="text-xl font-bold text-stone-100 tracking-tight mt-0.5">
              Pronto a praticare, {profile.name}?
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              {profile.companionName} ti aspetta per una chiacchierata naturale.
            </p>
          </div>

          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-md shrink-0">
            <img
              src={profile.companionAvatar}
              alt={profile.companionName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Daily Goal Bar */}
        <div className="bg-stone-900/80 rounded-2xl p-3 border border-stone-800/80 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-stone-300 font-medium flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Obiettivo di oggi: {profile.dailyGoalMinutes} min</span>
            </span>
            <span className="text-emerald-400 font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">
            {minutesToday} min completati oggi su {profile.dailyGoalMinutes} min previsti
          </span>
        </div>

        {/* Primary Call To Action Button */}
        <button
          onClick={() => onStartVoiceWithTopic(null)}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
        >
          <Mic className="w-5 h-5 stroke-[2.2]" />
          <span>Inizia a parlare adesso</span>
        </button>
      </div>

      {/* Gamified Daily Streak Counter Component */}
      <DailyStreakCounter
        profile={profile}
        onStartPractice={() => onStartVoiceWithTopic(null)}
      />

      {/* Visual Streak Calendar & Consistency Progress Bar */}
      <VisualStreakCalendar
        profile={profile}
        onStartPractice={() => onStartVoiceWithTopic(null)}
      />

      {/* Suggested Topic of the Day */}
      <div className="bg-stone-800/70 border border-stone-700/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Spunto di conversazione del giorno</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
            {suggestedTopic.suggestedLevel}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-stone-100 mb-1">
          {suggestedTopic.title}
        </h3>
        <p className="text-xs text-stone-400 leading-relaxed mb-3">
          {suggestedTopic.description}
        </p>

        <button
          onClick={() => onStartVoiceWithTopic(suggestedTopic)}
          className="w-full py-2 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-medium flex items-center justify-between transition-colors group"
        >
          <span>Discuti di questo tema</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Active Pedagogical Review Card (Spaced Repetition) */}
      {errorNeedingReview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Difficoltà da consolidare (Ripetizione spaziata)</span>
            </span>
          </div>
          <PedagogicalCorrectionCard
            error={errorNeedingReview}
            onPromoteStatus={onPromoteStatus}
            onPracticeNow={() => onStartVoiceWithTopic(null)}
          />
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-3 text-center">
          <Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <span className="text-lg font-bold text-stone-100 block">{profile.streakDays}</span>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider">Giorni di fila</span>
        </div>

        <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-3 text-center">
          <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <span className="text-lg font-bold text-stone-100 block">{profile.estimatedCefrLevel}</span>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider">Livello stimato</span>
        </div>

        <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-3 text-center">
          <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <span className="text-lg font-bold text-stone-100 block">{profile.completedSessionsCount}</span>
          <span className="text-[10px] text-stone-400 uppercase tracking-wider">Sessioni</span>
        </div>
      </div>

      {/* Quick Link to Paths & Progress */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          onClick={onGoToPercorsi}
          className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Esplora i percorsi</span>
        </button>

        <button
          onClick={onGoToProgressi}
          className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          <span>Vedi le 10 competenze</span>
        </button>
      </div>
    </div>
  );
};
