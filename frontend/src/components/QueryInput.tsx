import React, { useState } from 'react';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';

interface QueryInputProps {
  onAsk: (question: string) => void;
  isLoading: boolean;
  activeQuestion?: string;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  onAsk,
  isLoading,
  activeQuestion
}) => {
  const [inputVal, setInputVal] = useState(activeQuestion || '');

  React.useEffect(() => {
    if (activeQuestion !== undefined) {
      setInputVal(activeQuestion);
    }
  }, [activeQuestion]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    onAsk(inputVal.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2">
          <div className="flex items-start gap-2">
            <div className="p-2 text-indigo-400 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>

            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your data in plain English (e.g. 'What was life expectancy in India in 2020?')..."
              rows={2}
              disabled={isLoading}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none pt-2 font-medium"
            />

            <div className="flex items-center gap-1.5 self-end pb-1 pr-1">
              {inputVal && !isLoading && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                  inputVal.trim() && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask SYNAPDATA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

