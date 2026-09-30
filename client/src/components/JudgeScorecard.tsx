import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import { JudgeEvaluation, MetricEvaluation } from '../types';

interface JudgeScorecardProps {
  evaluation: JudgeEvaluation;
  onImprove?: () => void;
  isImproving?: boolean;
}

export const JudgeScorecard: React.FC<JudgeScorecardProps> = ({
  evaluation,
  onImprove,
  isImproving = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'Excellent':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30';
      case 'Good':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/30';
      case 'Needs Improvement':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30';
      case 'Critical Flaws':
        return 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 7.0) return 'text-indigo-600 dark:text-indigo-400';
    if (score >= 5.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 8.5) return 'bg-emerald-500';
    if (score >= 7.0) return 'bg-indigo-500';
    if (score >= 5.5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const renderStatusIcon = (status: 'passed' | 'warning' | 'failed') => {
    if (status === 'passed') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
    if (status === 'warning') {
      return <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
    return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  };

  // The 6 Evaluation Dimensions from user's architecture diagram
  const metricsList: {
    key: keyof JudgeEvaluation['metrics'];
    label: string;
    description: string;
    metric: MetricEvaluation;
  }[] = [
    {
      key: 'accuracy',
      label: 'Accuracy',
      description: 'Factual correctness, precision & valid reasoning',
      metric: evaluation.metrics.accuracy,
    },
    {
      key: 'relevance',
      label: 'Relevance',
      description: 'Direct answer to user prompt & core intent',
      metric: evaluation.metrics.relevance,
    },
    {
      key: 'completeness',
      label: 'Completeness',
      description: 'Coverage of all facets, sub-queries & context',
      metric: evaluation.metrics.completeness,
    },
    {
      key: 'hallucination',
      label: 'Hallucination',
      description: 'Grounding check (10/10 = 0% fabrication)',
      metric: evaluation.metrics.hallucination,
    },
    {
      key: 'tone',
      label: 'Tone',
      description: 'Professional, objective, clear & helpful delivery',
      metric: evaluation.metrics.tone,
    },
    {
      key: 'citationQuality',
      label: 'Citation quality',
      description: 'Source attribution, links & retrieved document integrity',
      metric: evaluation.metrics.citationQuality,
    },
  ];

  return (
    <div className="w-full mt-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 bg-slate-50/70 dark:bg-[#141418]/80 backdrop-blur-xs p-3 transition-all duration-200 shadow-2xs">
        {/* Top Header / Summary Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-[#5B50E6] dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                LLM as a Judge
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
                • {evaluation.judgeModel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Score & Verdict Badges */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${getScoreColor(evaluation.overallScore)}`}>
                {evaluation.overallScore.toFixed(1)}/10
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getVerdictStyle(
                  evaluation.verdict
                )}`}
              >
                {evaluation.verdict}
              </span>
            </div>

            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors flex items-center gap-0.5 text-[11px]"
              title={isExpanded ? 'Collapse evaluation' : 'View detailed evaluation'}
            >
              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsed Preview Line */}
        {!isExpanded && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-200/50 dark:border-zinc-800/60 pt-2">
            <span className="truncate">{evaluation.summary}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3 h-3" />
                6 Metrics Checked
              </span>
            </div>
          </div>
        )}

        {/* Expanded Detailed Breakdown */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-zinc-800/80 space-y-3.5 text-xs animate-in fade-in duration-200">
            {/* Executive Summary & Critique */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a20] border border-slate-200/80 dark:border-zinc-800 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Judge Assessment</span>
              </div>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                {evaluation.summary}
              </p>
              {evaluation.critique && evaluation.critique !== evaluation.summary && (
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed text-[11px] pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                  <strong className="text-slate-700 dark:text-zinc-300">Critique:</strong> {evaluation.critique}
                </p>
              )}
            </div>

            {/* 6 Metrics Grid (Matching Reference Architecture) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-0.5">
                <span>Evaluate on (6 Core Dimensions)</span>
                <span>Score</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {metricsList.map(({ key, label, description, metric }) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a20] border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between gap-1.5 shadow-2xs hover:border-indigo-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {renderStatusIcon(metric.status)}
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 text-xs">
                          {label}
                        </span>
                      </div>
                      <span className={`font-bold text-xs ${getScoreColor(metric.score)}`}>
                        {metric.score}/10
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(metric.score)} transition-all duration-500`}
                        style={{ width: `${(metric.score / 10) * 100}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {metric.comment || description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Improvements (if any) */}
            {evaluation.suggestedImprovements && evaluation.suggestedImprovements.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Recommended Improvements</span>
                </div>
                <ul className="list-disc list-inside text-amber-800 dark:text-amber-400 space-y-0.5 pl-0.5">
                  {evaluation.suggestedImprovements.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom "Improve (Regenerate if needed)" Action matching reference diagram */}
            {onImprove && (
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/60 dark:border-zinc-800/80">
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Refine answer using Judge feedback</span>
                </div>

                <button
                  onClick={onImprove}
                  disabled={isImproving}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isImproving ? 'animate-spin' : ''}`} />
                  <span>{isImproving ? 'Refining Response...' : 'Improve (Regenerate)'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
