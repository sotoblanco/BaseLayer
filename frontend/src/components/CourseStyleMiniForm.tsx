import { useState } from 'react';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  Terminal,
  Table,
  PenTool,
  Sparkles,
} from 'lucide-react';

export interface CourseStylePreferences {
  modalities: string[];
  scaffold: 'micro_steps' | 'guided_completion' | 'macro_challenges';
  explanationLength: 'short' | 'thorough';
  tutorStyle: 'solveit' | 'socratic' | 'direct' | 'blooms';
  level: 'beginner' | 'intermediate' | 'advanced';
}

interface CourseStyleMiniFormProps {
  preferences: CourseStylePreferences;
  onChange: (updated: CourseStylePreferences) => void;
  defaultExpanded?: boolean;
}

export default function CourseStyleMiniForm({
  preferences,
  onChange,
  defaultExpanded = true,
}: CourseStyleMiniFormProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleModality = (mod: string) => {
    const current = preferences.modalities;
    if (current.includes(mod)) {
      if (current.length === 1) return; // Keep at least one
      onChange({ ...preferences, modalities: current.filter((m) => m !== mod) });
    } else {
      onChange({ ...preferences, modalities: [...current, mod] });
    }
  };

  const formatModalitySummary = () => {
    const labels: string[] = [];
    if (preferences.modalities.includes('code')) labels.push('Code');
    if (preferences.modalities.includes('spreadsheet')) labels.push('Sheets');
    if (preferences.modalities.includes('drawing')) labels.push('Drawing');
    return labels.join(' + ') || 'Code';
  };

  const formatScaffoldSummary = () => {
    if (preferences.scaffold === 'guided_completion') return 'Guided blanks';
    if (preferences.scaffold === 'macro_challenges') return 'Challenges';
    return 'Micro-steps';
  };

  const formatTutorSummary = () => {
    if (preferences.tutorStyle === 'socratic') return 'Socratic';
    if (preferences.tutorStyle === 'direct') return 'Direct';
    return 'Solveit';
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden text-xs transition-all">
      {/* Header bar / accordion toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-900/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sliders size={14} />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-200 block text-xs">
              Tailor this course style
            </span>
            <span className="text-[11px] text-slate-400 truncate block">
              {formatModalitySummary()} · {formatScaffoldSummary()} · {formatTutorSummary()} · {preferences.level}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 pl-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">
            {isExpanded ? 'Hide' : 'Customize'}
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded mini-form options */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 p-4 space-y-4 bg-slate-900/40 animate-fadeIn">
          {/* 1. Modality Blend */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                1. Modality blend
              </label>
              <span className="text-[10px] text-slate-400">Select any blend for this topic</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'code',
                  label: 'Code Sandbox',
                  desc: 'Python & tests',
                  icon: Terminal,
                },
                {
                  id: 'spreadsheet',
                  label: 'Spreadsheet',
                  desc: 'Formulas & cells',
                  icon: Table,
                },
                {
                  id: 'drawing',
                  label: 'Hand-written',
                  desc: 'Visual sketches',
                  icon: PenTool,
                },
              ].map((item) => {
                const active = preferences.modalities.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleModality(item.id)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-emerald-500/80 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon size={14} className={active ? 'text-emerald-400' : 'text-slate-500'} />
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          active
                            ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                    <span className="text-xs font-semibold block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Scaffold Depth & Understanding Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Scaffold */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                2. Scaffold depth
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'guided_completion', label: 'Guided blanks' },
                  { id: 'micro_steps', label: 'Micro-steps' },
                  { id: 'macro_challenges', label: 'Challenges' },
                ].map((item) => {
                  const active = preferences.scaffold === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...preferences,
                          scaffold: item.id as 'micro_steps' | 'guided_completion' | 'macro_challenges',
                        })
                      }
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors text-center ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                3. Learner level
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'beginner', label: 'Beginner' },
                  { id: 'intermediate', label: 'Intermediate' },
                  { id: 'advanced', label: 'Advanced' },
                ].map((item) => {
                  const active = preferences.level === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...preferences,
                          level: item.id as 'beginner' | 'intermediate' | 'advanced',
                        })
                      }
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors text-center ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Explanation Depth & AI Tutor Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Explanation Length */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                4. Explanation depth
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'short', label: 'Concise essentials' },
                  { id: 'thorough', label: 'Detailed background' },
                ].map((item) => {
                  const active = preferences.explanationLength === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...preferences,
                          explanationLength: item.id as 'short' | 'thorough',
                        })
                      }
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors text-center ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tutor Style */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                5. SocratiQ tutor style
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'solveit', label: 'Solveit' },
                  { id: 'socratic', label: 'Socratic' },
                  { id: 'direct', label: 'Direct' },
                ].map((item) => {
                  const active = preferences.tutorStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...preferences,
                          tutorStyle: item.id as 'solveit' | 'socratic' | 'direct',
                        })
                      }
                      className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors text-center ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sync hint */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
            <Sparkles size={13} className="text-emerald-400 shrink-0" />
            <span>
              Evolving profile: tailored settings for this course blend into your LEARNING.md profile as you go.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
