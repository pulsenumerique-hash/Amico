/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserLearningProfile, StreakMilestone } from '../types';
import {
  Flame,
  Check,
  Award,
  Sparkles,
  Shield,
  Calendar,
  ChevronRight,
  Trophy,
  Zap,
  Info,
} from 'lucide-react';

interface DailyStreakCounterProps {
  profile: UserLearningProfile;
  onStartPractice: () => void;
}

export const DailyStreakCounter: React.FC<DailyStreakCounterProps> = ({
  profile,
  onStartPractice,
}) => {
  const [showMilestones, setShowMilestones] = useState(false);

  const streakDays = profile.streakDays || 1;
  const longestStreak = profile.longestStreakDays || Math.max(streakDays, 6);
  const goalSeconds = profile.dailyGoalMinutes * 60;
  const isTodayCompleted = profile.todayPracticeSeconds >= goalSeconds;
  const minutesToday = Math.floor(profile.todayPracticeSeconds / 60);
  const minutesRemaining = Math.max(0, profile.dailyGoalMinutes - minutesToday);

  // Gamification Milestones
  const milestones: StreakMilestone[] = [
    {
      days: 3,
      title: 'Scintilla Iniziale',
      badge: '🥉',
      description: '3 giorni consecutivi di italiano parlato',
      unlocked: streakDays >= 3,
    },
    {
      days: 7,
      title: 'Settimana di Fuoco',
      badge: '🔥',
      description: '1 settimana completa di conversazione quotidiana',
      unlocked: streakDays >= 7,
    },
    {
      days: 14,
      title: 'Parlante Costante',
      badge: '🥈',
      description: '2 settimane consecutive senza mai mollare',
      unlocked: streakDays >= 14,
    },
    {
      days: 30,
      title: 'Maestro d’Abitudine',
      badge: '🏆',
      description: '30 giorni consecutivi di immersione nella lingua',
      unlocked: streakDays >= 30,
    },
  ];

  const nextMilestone = milestones.find((m) => !m.unlocked) || milestones[milestones.length - 1];
  const progressToNextMilestone = Math.min(
    100,
    Math.round((streakDays / nextMilestone.days) * 100)
  );

  // Generate 7-day week array (Mon to Sun)
  const getWeekDays = () => {
    const today = new Date();
    // Monday is index 0 in ISO week
    const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    const weekLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
    const fullWeekLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    const streakHistorySet = new Set(profile.streakHistory || []);
    const todayStr = today.toISOString().split('T')[0];

    return weekLabels.map((shortLabel, index) => {
      const diffFromCurrent = index - currentDayOfWeek;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diffFromCurrent);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const isToday = index === currentDayOfWeek;
      const isPast = index < currentDayOfWeek;
      const isFuture = index > currentDayOfWeek;

      // Completed if in history or if today and goal done
      const isCompleted = streakHistorySet.has(targetDateStr) || (isToday && isTodayCompleted);

      return {
        shortLabel,
        fullLabel: fullWeekLabels[index],
        dateNumber: targetDate.getDate(),
        isToday,
        isPast,
        isFuture,
        isCompleted,
      };
    });
  };

  const weekDays = getWeekDays();

  return (
    <div className="bg-gradient-to-br from-stone-800/90 via-stone-850 to-stone-900 border border-amber-500/30 rounded-3xl p-4 shadow-lg shadow-amber-950/20 relative overflow-hidden backdrop-blur-sm">
      {/* Background ambient fire glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Counter Banner */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-3">
          {/* Pulsing Flame Icon Box */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/30 animate-pulse">
              <Flame className="w-7 h-7 fill-stone-950 stroke-[1.8]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-stone-900 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400">
              ⚡
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-extrabold text-stone-100 tracking-tight">
                {streakDays} {streakDays === 1 ? 'Giorno' : 'Giorni'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Serie Attiva
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {isTodayCompleted
                ? '🔥 Obiettivo di oggi completato! Serie al sicuro.'
                : `Parla ancora ${minutesRemaining} min oggi per non interrompere la serie!`}
            </p>
          </div>
        </div>

        {/* Milestone Trigger */}
        <button
          onClick={() => setShowMilestones(!showMilestones)}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-xs font-semibold text-amber-300 transition-colors"
          title="Visualizza trofei e traguardi"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono">{nextMilestone.days}gg</span>
          <ChevronRight className="w-3 h-3 text-stone-400" />
        </button>
      </div>

      {/* 7-Day Interactive Visual Tracker */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-stone-300 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Questa settimana</span>
          </span>
          <span className="text-[10px] text-stone-400">
            Record personale: <strong className="text-stone-200">{longestStreak} gg</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, idx) => {
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                  day.isCompleted
                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-200'
                    : day.isToday
                    ? 'bg-stone-800 border-2 border-dashed border-amber-400/70 text-stone-200 animate-pulse'
                    : 'bg-stone-850/60 border border-stone-800 text-stone-500'
                }`}
              >
                <span className="text-[10px] font-bold uppercase block mb-1">
                  {day.shortLabel}
                </span>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    day.isCompleted
                      ? 'bg-amber-400 text-stone-950 shadow-sm shadow-amber-400/40'
                      : day.isToday
                      ? 'bg-stone-700 text-amber-300'
                      : 'text-stone-400'
                  }`}
                >
                  {day.isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span>{day.dateNumber}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Milestone Progress Bar */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-300 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Prossimo traguardo: <strong>{nextMilestone.title}</strong>
            </span>
          </span>
          <span className="font-mono text-amber-400 font-semibold">
            {streakDays}/{nextMilestone.days} gg ({progressToNextMilestone}%)
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-stone-900 border border-stone-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 rounded-full transition-all duration-500"
            style={{ width: `${progressToNextMilestone}%` }}
          />
        </div>
      </div>

      {/* Quick Action when today not completed */}
      {!isTodayCompleted && (
        <button
          onClick={onStartPractice}
          className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-98 transition-all"
        >
          <Flame className="w-3.5 h-3.5 fill-stone-950" />
          <span>Completa la sessione di oggi ({minutesRemaining} min)</span>
        </button>
      )}

      {/* Expandable Milestones & Gamification Badges Drawer */}
      {showMilestones && (
        <div className="mt-3 pt-3 border-t border-stone-700/60 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-200">Traguardi di Costanza</span>
            <span className="text-[10px] text-stone-400">
              {milestones.filter((m) => m.unlocked).length}/{milestones.length} Sbloccati
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {milestones.map((m) => (
              <div
                key={m.days}
                className={`p-2.5 rounded-xl border transition-all ${
                  m.unlocked
                    ? 'bg-amber-500/10 border-amber-500/40 text-stone-100 shadow-sm'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{m.badge}</span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      m.unlocked
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {m.days} Giorni
                  </span>
                </div>
                <h4 className="font-semibold text-[11px] text-stone-200 truncate">
                  {m.title}
                </h4>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">
                  {m.description}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800 flex items-start space-x-2 text-[11px] text-stone-400">
            <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-300">Scudo Protettivo Serie:</strong> Se salti un giorno per un imprevisto, Amico ti propone un mini-ripasso per recuperare la serie senza perdere i tuoi traguardi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
