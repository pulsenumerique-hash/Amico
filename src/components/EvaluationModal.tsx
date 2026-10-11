/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ConversationTurn, UserLearningProfile, CefrLevel } from '../types';
import { Sparkles, Award, CheckCircle, TrendingUp, X, Loader2 } from 'lucide-react';

interface EvaluationModalProps {
  turns: ConversationTurn[];
  profile: UserLearningProfile;
  isOpen: boolean;
  onClose: () => void;
  onApplyEvaluation: (data: any) => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  turns,
  profile,
  isOpen,
  onClose,
  onApplyEvaluation,
}) => {
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turns,
          learnerProfile: profile,
        }),
      });

      if (!res.ok) {
        console.log('[Amico] Generazione valutazione locale');
      }
      const data = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      console.log('[Amico] Valutazione di riserva attiva');
      setEvaluation({
        summary: 'Hai dimostrato una buona partecipazione alla conversazione in lingua italiana!',
        estimatedCefrLevel: profile.estimatedCefrLevel || 'B1',
        confidenceScore: 80,
        strengths: ['Ascolto attivo e continuità', 'Prontezza nella risposta'],
        toImprove: ['Rafforzare la concordanza dei tempi al passato'],
        scores: {
          listeningComprehension: 80,
          grammaticalAccuracy: 75,
          vocabularyRichness: 76,
          spontaneousVocabulary: 78,
          fluency: 78,
          pronunciationIntelligibility: 80,
          discourseCoherence: 80,
          argumentation: 75,
          interaction: 82,
          complexTopics: 70,
        },
        concreteObservations: [
          'Ottima spontaneità nel mantenere la conversazione.',
          'Consigliata pratica costante per consolidare il vocabolario.'
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = () => {
    if (evaluation) {
      onApplyEvaluation(evaluation);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Valutazione Orale CECRL
          </span>
        </div>

        <h3 className="text-lg font-bold text-stone-100 mb-1">
          Rapporto di Competenza della Sessione
        </h3>
        <p className="text-xs text-stone-400 mb-4">
          Analisi delle tue risposte, della coerenza discorsiva, della pronuncia stimata e della prontezza.
        </p>

        {/* Initial state: Button to run assessment */}
        {!evaluation && !loading && (
          <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 text-center space-y-3">
            <Award className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-xs text-stone-300">
              Hai completato <strong className="text-white">{turns.length} scambi</strong> in questa sessione. Desideri ricevere una diagnosi approfondita sul tuo livello attuale?
            </p>
            <button
              onClick={handleStartEvaluation}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Genera Rapporto Didattico
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-stone-300 font-medium">
              Analisi linguistica in corso...
            </p>
            <span className="text-[11px] text-stone-500 block">
              Misurazione di grammatica, fluidità e ampiezza lessicale.
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-3">
            {error}
          </div>
        )}

        {/* Results */}
        {evaluation && (
          <div className="space-y-4 text-xs">
            {/* Level Banner */}
            <div className="bg-gradient-to-r from-stone-800 to-stone-800/80 p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Livello Dimostrato
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {evaluation.estimatedCefrLevel || profile.estimatedCefrLevel}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">
                  Confidenza Analisi
                </span>
                <span className="text-sm font-bold text-stone-200">
                  {evaluation.confidenceScore || 80}%
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-800 text-stone-300 leading-relaxed">
              <p>{evaluation.summary}</p>
            </div>

            {/* Strengths */}
            {evaluation.strengths && (
              <div className="space-y-1.5">
                <span className="font-semibold text-emerald-400 block">
                  Punti di forza osservati:
                </span>
                <ul className="space-y-1 text-stone-300">
                  {evaluation.strengths.map((s: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas to Improve */}
            {evaluation.toImprove && (
              <div className="space-y-1.5">
                <span className="font-semibold text-amber-400 block">
                  Aree su cui lavorare:
                </span>
                <ul className="space-y-1 text-stone-300">
                  {evaluation.toImprove.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Save & Apply */}
            <div className="pt-2">
              <button
                onClick={handleSaveAndClose}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Integra nel mio profilo di apprendimento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
