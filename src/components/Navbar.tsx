/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Mic, Compass, BarChart3, User, Sparkles } from 'lucide-react';

export type NavigationTab = 'home' | 'parla' | 'percorso' | 'progressi' | 'profilo';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isVoiceActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, isVoiceActive }) => {
  const tabs = [
    { id: 'home' as NavigationTab, label: 'Oggi', icon: Home },
    { id: 'parla' as NavigationTab, label: 'Parla', icon: Mic, highlight: true },
    { id: 'percorso' as NavigationTab, label: 'Percorso', icon: Compass },
    { id: 'progressi' as NavigationTab, label: 'Progressi', icon: BarChart3 },
    { id: 'profilo' as NavigationTab, label: 'Profilo', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-lg border-t border-stone-800 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isVoiceActive
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-stone-950 shadow-emerald-500/30 ring-4 ring-emerald-500/20 animate-pulse'
                      : isActive
                      ? 'bg-emerald-500 text-stone-950 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                      : 'bg-stone-800 text-emerald-400 border-2 border-stone-700 shadow-stone-950/50 hover:bg-stone-700'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-stone-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center py-1 px-3 text-stone-400 hover:text-stone-200 transition-colors focus:outline-none"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-emerald-400 scale-110' : 'text-stone-400'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] mt-1 font-medium transition-colors ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-stone-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
