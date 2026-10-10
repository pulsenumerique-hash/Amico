/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserLearningProfile, VoiceState } from '../types';
import { Sparkles, Flame, Volume2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  profile: UserLearningProfile;
  voiceState: VoiceState;
  onOpenVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, voiceState, onOpenVoice }) => {
  const isSpeaking = voiceState === 'SPEAKING';
  const isListening = voiceState === 'LISTENING';

  return (
    <header className="sticky top-0 z-30 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Companion Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                isSpeaking
                  ? 'border-emerald-400 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30 animate-pulse'
                  : isListening
                  ? 'border-amber-400 ring-4 ring-amber-500/20'
                  : 'border-stone-700'
              }`}
            >
              <img
                src={profile.companionAvatar}
                alt={profile.companionName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Live Indicator */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-stone-900 transition-colors ${
                isSpeaking
                  ? 'bg-emerald-400'
                  : isListening
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-stone-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-semibold text-stone-100 tracking-tight">
                {profile.companionName}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {profile.estimatedCefrLevel}
              </span>
            </div>
            <p className="text-xs text-stone-400 capitalize">
              {profile.conversationStyle === 'amico'
                ? 'Amico italiano'
                : profile.conversationStyle === 'professore'
                ? 'Professore madrelingua'
                : profile.conversationStyle === 'dibattito'
                ? 'Partner di dibattito'
                : 'Coach di espressione'}
            </p>
          </div>
        </div>

        {/* Stats & Quick Voice Action */}
        <div className="flex items-center space-x-2">
          {/* Streak */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700/60 text-xs font-medium text-amber-300">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{profile.streakDays} gg</span>
          </div>

          {/* Quick Speak Trigger */}
          <button
            onClick={onOpenVoice}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              voiceState !== 'IDLE'
                ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{voiceState !== 'IDLE' ? 'In corso' : 'Parla'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
