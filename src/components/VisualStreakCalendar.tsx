/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserLearningProfile } from '../types';
import {
  Calendar,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react';

interface VisualStreakCalendarProps {
  profile: UserLearningProfile;
  onStartPractice?: () => void;
}

export const VisualStreakCalendar: React.FC<VisualStreakCalendarProps> = ({
  profile,
  onStartPractice,
}) => {
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Current date reference
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const monthNames = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];

  const currentMonthName = monthNames[currentMonth];

  // Number of days in current month
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // First day of current month (0: Sunday, 1: Monday, ...)
  const firstDayOfMonthRaw = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const firstDayOfMonth = (firstDayOfMonthRaw + 6) % 7;

  // Streak history set
  const streakHistorySet = new Set(profile.streakHistory || []);
  const todayStr = now.toISOString().split('T')[0];
  const goalSeconds = profile.dailyGoalMinutes * 60;
  const isTodayGoalCompleted = profile.todayPracticeSeconds >= goalSeconds;

  // Calculate total successful practice days this month
  let successfulDaysThisMonth = 0;
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (streakHistorySet.has(dStr) || (dStr === todayStr && isTodayGoalCompleted)) {
      successfulDaysThisMonth++;
    }
  }

  // Monthly goal target (e.g. 20 active days out of month)
  const monthlyTargetDays = 20;
  const monthlyProgressPercent = Math.min(
    100,
    Math.round((successfulDaysThisMonth / monthlyTargetDays) * 100)
  );

  // Month days grid array
  const calendarCells = [];
  // Empty padding cells before 1st day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }

  // Actual days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dStr === todayStr;
    const isPast = day < now.getDate();
    const isFuture = day > now.getDate();
    const isCompleted = streakHistorySet.has(dStr) || (isToday && isTodayGoalCompleted);

    calendarCells.push({
      type: 'day',
      key: `day-${day}`,
      dayNumber: day,
      dateStr: dStr,
      isToday,
      isPast,
      isFuture,
      isCompleted,
    });
  }

  // Handle day click
  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(selectedDateStr === dateStr ? null : dateStr);
  };

  const selectedDayInfo = selectedDateStr
    ? {
        dateStr: selectedDateStr,
        isCompleted:
          streakHistorySet.has(selectedDateStr) ||
          (selectedDateStr === todayStr && isTodayGoalCompleted),
        isToday: selectedDateStr === todayStr,
      }
    : null;

  return (
    <div className="bg-stone-850/80 border border-stone-700/80 rounded-3xl p-4 shadow-sm space-y-4">
      {/* Calendar Header with Title and Month Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-100 flex items-center space-x-1.5">
              <span>Calendario di Costanza</span>
            </h3>
            <span className="text-[11px] text-stone-400">
              {currentMonthName} {currentYear}
            </span>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{successfulDaysThisMonth} giorni attivi</span>
        </div>
      </div>

      {/* Visual Consistency Progress Bar */}
      <div className="bg-stone-900/70 p-3 rounded-2xl border border-stone-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-300 font-medium flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Progresso mensile:</span>
          </span>
          <span className="font-bold text-emerald-400">
            {successfulDaysThisMonth} / {monthlyTargetDays} giorni ({monthlyProgressPercent}%)
          </span>
        </div>

        {/* Multi-tier Gradient Bar */}
        <div className="w-full h-2.5 rounded-full bg-stone-800 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/30"
            style={{ width: `${monthlyProgressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-400">
          <span>Minimo consigliato: 15 gg</span>
          <span>Obiettivo ideale: 20 gg 🔥</span>
        </div>
      </div>

      {/* 30-Day Calendar Grid */}
      <div className="bg-stone-900/60 p-3 rounded-2xl border border-stone-800">
        {/* Day-of-week headers (Monday to Sunday) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => (
            <span
              key={d}
              className="text-[10px] font-bold text-stone-400 uppercase tracking-wider"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="h-8 w-full" />;
            }

            const { dayNumber, dateStr, isToday, isCompleted, isFuture } = cell;
            const isSelected = selectedDateStr === dateStr;

            return (
              <button
                key={cell.key}
                onClick={() => dateStr && handleDayClick(dateStr)}
                className={`h-9 w-full rounded-xl flex flex-col items-center justify-center text-xs relative transition-all active:scale-95 focus:outline-none ${
                  isCompleted
                    ? 'bg-gradient-to-br from-amber-500/25 to-orange-500/20 border border-amber-500/50 text-amber-200 font-bold shadow-sm shadow-amber-500/10'
                    : isToday
                    ? 'bg-stone-800 border-2 border-dashed border-amber-400 text-stone-100 font-bold ring-2 ring-amber-400/20'
                    : isFuture
                    ? 'text-stone-400 opacity-40 hover:opacity-70'
                    : 'bg-stone-850/40 text-stone-400 hover:text-stone-300 border border-stone-800/80'
                } ${isSelected ? 'ring-2 ring-emerald-400' : ''}`}
                title={`${dayNumber} ${currentMonthName}`}
              >
                <span className="text-[11px] leading-none">{dayNumber}</span>

                {/* Flame indicator on completed days */}
                {isCompleted && (
                  <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400 mt-0.5" />
                )}

                {/* Today pulse dot if not yet completed */}
                {isToday && !isCompleted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Pill */}
      {selectedDayInfo && (
        <div className="bg-stone-900 p-3 rounded-2xl border border-stone-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            {selectedDayInfo.isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selectedDayInfo.isToday ? (
              <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-stone-600 flex items-center justify-center text-[10px] text-stone-500 shrink-0">
                —
              </span>
            )}
            <div>
              <span className="font-semibold text-stone-200 block">
                {selectedDayInfo.dateStr.split('-')[2]} {currentMonthName} {currentYear}
              </span>
              <span className="text-[11px] text-stone-400">
                {selectedDayInfo.isCompleted
                  ? 'Sessione vocale completata con successo ✓'
                  : selectedDayInfo.isToday
                  ? `Oggi: ${Math.floor(profile.todayPracticeSeconds / 60)} min su ${profile.dailyGoalMinutes} min previsti`
                  : 'Nessuna sessione registrata in questa data.'}
              </span>
            </div>
          </div>

          {selectedDayInfo.isToday && !selectedDayInfo.isCompleted && onStartPractice && (
            <button
              onClick={onStartPractice}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 transition-colors"
            >
              Pratica ora
            </button>
          )}
        </div>
      )}

      {/* Calendar Legend */}
      <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 pt-1 border-t border-stone-800">
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/50" />
          <span>Sessione completata</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-amber-400 inline-block" />
          <span>Oggi</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-700 inline-block" />
          <span>Pausa</span>
        </span>
      </div>
    </div>
  );
};
