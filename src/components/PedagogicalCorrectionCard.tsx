/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PedagogicalError, ErrorLearningStatus } from '../types';
import { CheckCircle2, AlertCircle, BookOpen, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

interface PedagogicalCorrectionCardProps {
  error: PedagogicalError;
  onPromoteStatus?: (errorId: string, success: boolean) => void;
  onPracticeNow?: (error: PedagogicalError) => void;
  compact?: boolean;
}

export const PedagogicalCorrectionCard: React.FC<PedagogicalCorrectionCardProps> = ({
  error,
  onPromoteStatus,
  onPracticeNow,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const getStatusBadge = (status: ErrorLearningStatus) => {
    switch (status) {
      case 'padroneggiata':
        return { label: 'Padroneggiata', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'in_consolidamento':
        return { label: 'In consolidamento', bg: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
      case 'in_apprendimento':
        return { label: 'In apprendimento', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'da_ripassare':
        return { label: 'Da ripassare', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'da_confermare':
        return { label: 'Da confermare', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      default:
        return { label: 'Rilevata', bg: 'bg-stone-800 text-stone-400 border-stone-700' };
    }
  };

  const badge = getStatusBadge(error.status);

  return (
    <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-4 shadow-sm hover:border-stone-600 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize bg-stone-700 text-stone-300">
            {error.category}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>
        <span className="text-[11px] text-stone-400">
          Incontrata {error.timesEncountered} {error.timesEncountered === 1 ? 'volta' : 'volte'}
        </span>
      </div>

      {/* Comparison: Original vs Corrected */}
      <div className="space-y-2 mb-3 bg-stone-900/60 p-3 rounded-xl border border-stone-800">
        <div className="flex items-start space-x-2 text-xs">
          <span className="text-rose-400 font-bold shrink-0">Prima:</span>
          <span className="text-stone-300 line-through decoration-rose-400/60">
            {error.originalText}
          </span>
        </div>
        <div className="flex items-start space-x-2 text-xs">
          <span className="text-emerald-400 font-bold shrink-0">Naturale:</span>
          <span className="text-emerald-300 font-medium">
            {error.correctedText}
          </span>
        </div>
      </div>

      {/* Rule Name */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-stone-200 flex items-center space-x-1.5">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>{error.ruleName}</span>
        </h4>
      </div>

      {/* Explanation & Example */}
      {isExpanded ? (
        <div className="space-y-2 text-xs text-stone-400 bg-stone-900/30 p-2.5 rounded-lg border border-stone-800/60">
          <p className="leading-relaxed text-stone-300">{error.explanation}</p>
          {error.example && (
            <div className="pt-1.5 border-t border-stone-800 flex items-start space-x-1.5 text-stone-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <span className="italic font-serif text-stone-200">“{error.example}”</span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-stone-400 hover:text-stone-200 underline decoration-stone-600"
        >
          Mostra spiegazione dettagliata...
        </button>
      )}

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-stone-700/60 flex items-center justify-between">
        {onPracticeNow && (
          <button
            onClick={() => onPracticeNow(error)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Esercitati oralmente</span>
          </button>
        )}

        {onPromoteStatus && error.status !== 'padroneggiata' && (
          <button
            onClick={() => onPromoteStatus(error.id, true)}
            className="flex items-center space-x-1 text-xs text-stone-300 hover:text-emerald-400 bg-stone-700/60 hover:bg-stone-700 px-2.5 py-1 rounded-full transition-colors ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ho capito la regola</span>
          </button>
        )}
      </div>
    </div>
  );
};
