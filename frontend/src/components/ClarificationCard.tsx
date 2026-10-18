import React from 'react';
import { HelpCircle, ArrowRight, Check, Sparkles } from 'lucide-react';
import { ClarificationDetails } from '../types';

interface ClarificationCardProps {
  clarification: ClarificationDetails;
  onSelectOption: (optionText: string) => void;
  onUseDefault: (defaultText: string) => void;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({
  clarification,
  onSelectOption,
  onUseDefault
}) => {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-900 border border-amber-600/40 p-5 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Ambiguity Detected
            </span>
            <span className="text-xs text-slate-400">• Gemma Planner Clarification</span>
          </div>

          <h3 className="text-base font-semibold text-slate-100 mb-2">
            {clarification.question}
          </h3>

          <p className="text-xs text-slate-400 mb-4">
            The question uses subjective or incomplete criteria. Please clarify your specific analytical objective or proceed with our calibrated default assumption.
          </p>

          {/* Options */}
          {clarification.options && clarification.options.length > 0 && (
            <div className="space-y-2 mb-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Select an interpretation:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clarification.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectOption(opt)}
                    className="p-3 text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-xs text-slate-200 transition-all flex items-center justify-between group"
                  >
                    <span className="leading-snug">{opt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Default Assumption Action */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Default Assumption: </span>
              <span className="italic">{clarification.defaultAssumption}</span>
            </div>

            <button
              onClick={() => onUseDefault(clarification.defaultAssumption)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use Default Assumption</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

