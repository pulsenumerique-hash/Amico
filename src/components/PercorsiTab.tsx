/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserLearningProfile, LearningPathModule, TopicCatalogItem } from '../types';
import { LEARNING_PATHS, TOPIC_CATALOG } from '../data/curriculum';
import {
  Compass,
  BookOpen,
  Mic,
  Search,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface PercorsiTabProps {
  profile: UserLearningProfile;
  onStartPath: (path: LearningPathModule) => void;
  onStartTopic: (topic: TopicCatalogItem) => void;
}

export const PercorsiTab: React.FC<PercorsiTabProps> = ({
  profile,
  onStartPath,
  onStartTopic,
}) => {
  const [activeSection, setActiveSection] = useState<'percorsi' | 'catalogo'>('percorsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');

  const categories = [
    'Tutti',
    'Vita Quotidiana',
    'Cultura & Cucina Italiana',
    'Lavoro & Carriera',
    'Scienza & Tecnologia',
    'Idee & Filosofia',
    'Oratoria & Comunicazione',
  ];

  const filteredTopics = TOPIC_CATALOG.filter((topic) => {
    const matchesSearch =
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Tutti' || topic.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Section Switcher */}
      <div className="bg-stone-800/80 p-1 rounded-2xl border border-stone-700/80 flex items-center">
        <button
          onClick={() => setActiveSection('percorsi')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'percorsi'
              ? 'bg-emerald-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          8 Percorsi Strutturati
        </button>
        <button
          onClick={() => setActiveSection('catalogo')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === 'catalogo'
              ? 'bg-emerald-500 text-stone-950 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Catalogo 50 Temi
        </button>
      </div>

      {/* 8 Structured Modules */}
      {activeSection === 'percorsi' && (
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-bold text-stone-100">
              Percorsi di Perfezionamento Orale
            </h2>
            <p className="text-xs text-stone-400">
              Moduli tematici per passare da risposte scolastiche a una spontaneità nativa.
            </p>
          </div>

          <div className="space-y-3">
            {LEARNING_PATHS.map((path) => (
              <div
                key={path.id}
                className="bg-stone-800/70 border border-stone-700/80 rounded-2xl p-4 shadow-sm hover:border-emerald-500/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    {path.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
                    Livello {path.level}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-stone-100 mb-1 group-hover:text-emerald-300 transition-colors">
                  {path.title}
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-3">
                  {path.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-stone-700/60">
                  <span className="text-[11px] text-stone-400">
                    {path.exercisesCount} simulazioni interattive
                  </span>

                  <button
                    onClick={() => onStartPath(path)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs active:scale-95 transition-all shadow-sm shadow-emerald-500/20"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Inizia sessione</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 50 Topics Catalog */}
      {activeSection === 'catalogo' && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca un tema (es. cucina, cinema, lavoro)..."
              className="w-full bg-stone-800 border border-stone-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-stone-950 font-semibold'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Topics List */}
          <div className="space-y-2.5">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-3.5 hover:border-stone-600 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="mr-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                      {topic.category}
                    </span>
                    <h4 className="text-xs font-semibold text-stone-200">
                      {topic.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-700/80 text-stone-300 shrink-0">
                    {topic.suggestedLevel}
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                  {topic.description}
                </p>

                <button
                  onClick={() => onStartTopic(topic)}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Avvia conversazione su questo tema</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
