/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserLearningProfile,
  CorrectionMode,
  ConversationStyle,
  UserPersonalMemory,
} from '../types';
import {
  User,
  Settings,
  Volume2,
  Brain,
  Shield,
  Trash2,
  Download,
  Plus,
  Edit2,
  Check,
  X,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Mic,
  Sliders,
} from 'lucide-react';

interface ProfiloTabProps {
  profile: UserLearningProfile;
  onUpdateProfile: (updates: Partial<UserLearningProfile>) => void;
  onAddMemory: (content: string, category: UserPersonalMemory['category']) => void;
  onDeleteMemory: (id: string) => void;
  onExportData: () => void;
  onWipeData: () => void;
}

export const ProfiloTab: React.FC<ProfiloTabProps> = ({
  profile,
  onUpdateProfile,
  onAddMemory,
  onDeleteMemory,
  onExportData,
  onWipeData,
}) => {
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<UserPersonalMemory['category']>('interesse');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const companions = [
    {
      name: 'Matteo',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      gender: 'male' as const,
      desc: 'Amico socievole, caldo e spontaneo',
    },
    {
      name: 'Giulia',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      gender: 'female' as const,
      desc: 'Professoressa accogliente, attenta alle sfumature',
    },
    {
      name: 'Marco',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      gender: 'male' as const,
      desc: 'Partner di dibattito, oratoria e pensiero critico',
    },
  ];

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    onAddMemory(newMemoryText.trim(), newMemoryCategory);
    setNewMemoryText('');
    setShowAddMemory(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Profile Header */}
      <div className="bg-stone-800/80 border border-stone-700/80 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-100">{profile.name}</h2>
          <p className="text-xs text-stone-400">
            Livello stimato: <span className="text-emerald-400 font-semibold">{profile.estimatedCefrLevel}</span>
          </p>
          <span className="text-[11px] text-stone-500">
            {profile.completedSessionsCount} sessioni completate • {profile.streakDays} gg consecutivi
          </span>
        </div>
      </div>

      {/* 1. Companion Personalization */}
      <div className="bg-stone-800/60 border border-stone-700/60 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Personalizza il tuo compagno italiano</span>
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {companions.map((comp) => {
            const isSelected = profile.companionName === comp.name;
            return (
              <button
                key={comp.name}
                onClick={() =>
                  onUpdateProfile({
                    companionName: comp.name,
                    companionAvatar: comp.avatar,
                    voiceGender: comp.gender,
                  })
                }
                className={`p-2 rounded-2xl border text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500 text-stone-100 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-stone-900/60 border-stone-700/80 text-stone-400 hover:border-stone-600'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1.5 border border-stone-700">
                  <img src={comp.avatar} alt={comp.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold block text-stone-200">{comp.name}</span>
                <span className="text-[9px] text-stone-400 block mt-0.5 leading-tight">{comp.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Voice Engine Setting */}
        <div className="pt-2 border-t border-stone-700/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-300 font-medium">Motore di Sintesi Vocale:</span>
            <select
              value={profile.voiceEngine}
              onChange={(e) => onUpdateProfile({ voiceEngine: e.target.value as any })}
              className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1 text-stone-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="gemini_neural">Gemini Neural Voice (Studio HD)</option>
              <option value="browser_voice">Browser Voice (Zero Latency)</option>
            </select>
          </div>

          {/* Speed slider */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-stone-300 font-medium">
              Velocità di pronuncia: {profile.voiceSpeed}x
            </span>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={profile.voiceSpeed}
              onChange={(e) => onUpdateProfile({ voiceSpeed: parseFloat(e.target.value) })}
              className="w-32 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Microphone sensitivity & capture */}
          <div className="pt-2 border-t border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-stone-300 font-medium block flex items-center space-x-1">
                  <Mic className="w-3.5 h-3.5 text-emerald-400 inline" />
                  <span>Sensibilità Microfono & Riconoscimento:</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  Adatta la sensibilità della cattura per voci delicate o ambienti rumorosi
                </span>
              </div>
              <select
                value={profile.micSensitivityPreset || 'high'}
                onChange={(e) => onUpdateProfile({ micSensitivityPreset: e.target.value as any })}
                className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1 text-stone-200 focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="high">Alta Sensibilità (Voce dolce / Consigliata)</option>
                <option value="balanced">Bilanciata (Standard)</option>
                <option value="noisy_env">Filtro Rumore (Ambiente caotico)</option>
              </select>
            </div>

            {/* Software Gain Boost */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-stone-300 text-xs block">
                  Amplificazione Software (Gain): {(profile.micInputGain || 1.4).toFixed(1)}x
                </span>
                <span className="text-[10px] text-stone-400">
                  Aumenta la sensibilità di rilevamento se parli a bassa voce o lontano dal microfono
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={profile.micInputGain || 1.4}
                onChange={(e) => onUpdateProfile({ micInputGain: parseFloat(e.target.value) })}
                className="w-28 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Pause tolerance */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800">
            <div>
              <span className="text-stone-300 font-medium block">Tolleranza pause vocali:</span>
              <span className="text-[10px] text-stone-400">Tempo concesso per riflettere a metà frase</span>
            </div>
            <select
              value={profile.pauseToleranceMs || 3000}
              onChange={(e) => onUpdateProfile({ pauseToleranceMs: parseInt(e.target.value, 10) })}
              className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1 text-stone-200 focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="2200">Rapida (2.2s)</option>
              <option value="3000">Naturale (3.0s - consigliata)</option>
              <option value="4000">Ampia / Riflessiva (4.0s)</option>
              <option value="5000">Molto paziente (5.0s - tempo per cercare i termini)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Multi-level Personal Memory Manager */}
      <div className="bg-stone-800/60 border border-stone-700/60 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-1.5">
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span>Memoria Personale di Amico ({profile.memories.length})</span>
          </h3>
          <button
            onClick={() => setShowAddMemory(true)}
            className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi ricordo</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-400 leading-relaxed">
          Amico ricorda i tuoi interessi per arricchire le future conversazioni. Sei sempre tu a decidere cosa memorizzare o cancellare.
        </p>

        {/* Add Memory Modal/Form */}
        {showAddMemory && (
          <form onSubmit={handleAddMemorySubmit} className="bg-stone-900 p-3 rounded-2xl border border-stone-700 space-y-2">
            <input
              type="text"
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              placeholder="Es. Vorrei imparare l'italiano per fare un viaggio a Firenze..."
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center justify-between">
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                className="bg-stone-800 border border-stone-700 rounded-xl px-2 py-1 text-xs text-stone-300"
              >
                <option value="interesse">Interesse</option>
                <option value="obiettivo">Obiettivo</option>
                <option value="progetto">Progetto</option>
                <option value="aneddoto">Aneddoto</option>
              </select>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemory(false)}
                  className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!newMemoryText.trim()}
                  className="px-3 py-1 bg-emerald-500 text-stone-950 font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  Salva
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Memory Items List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {profile.memories.map((mem) => (
            <div
              key={mem.id}
              className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800 text-xs flex items-start justify-between group"
            >
              <div className="mr-2">
                <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider block mb-0.5">
                  {mem.category}
                </span>
                <p className="text-stone-300 text-xs">{mem.content}</p>
              </div>
              <button
                onClick={() => onDeleteMemory(mem.id)}
                className="text-stone-500 hover:text-rose-400 p-1 opacity-80 group-hover:opacity-100 transition-opacity"
                title="Cancella questo ricordo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Privacy, Trasparenza & GDPR */}
      <div className="bg-stone-800/60 border border-stone-700/60 rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Trasparenza e Privacy dei Dati</span>
        </h3>

        <div className="space-y-1.5 text-xs text-stone-400 leading-relaxed bg-stone-900/40 p-3 rounded-2xl border border-stone-800">
          <p>
            • <strong className="text-stone-300">Nessun file audio archiviato:</strong> La tua voce viene elaborata in streaming per la trascrizione e non viene salvata sui nostri server.
          </p>
          <p>
            • <strong className="text-stone-300">Chiavi API sicure:</strong> Tutte le chiamate ai modelli di intelligenza artificiale sono protette lato server.
          </p>
          <p>
            • <strong className="text-stone-300">Controllo completo:</strong> Puoi scaricare tutti i tuoi progressi o cancellarli definitivamente in qualsiasi momento.
          </p>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={onExportData}
            className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Esporta i miei dati</span>
          </button>

          <button
            onClick={() => setShowWipeConfirm(true)}
            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Cancella tutto</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showWipeConfirm && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl space-y-2 text-xs text-rose-200">
            <p className="font-semibold">Sei sicuro di voler eliminare tutti i dati?</p>
            <p className="text-[11px] text-rose-300/80">
              Questa azione cancellerà tutti i progressi, le registrazioni degli errori e i ricordi pedagogici. Non può essere annullata.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setShowWipeConfirm(false)}
                className="px-3 py-1 bg-stone-800 rounded-xl text-stone-300"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onWipeData();
                  setShowWipeConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Conferma cancellazione
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
