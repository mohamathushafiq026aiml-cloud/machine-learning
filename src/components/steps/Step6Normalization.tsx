import React, { useState, useMemo } from 'react';
import {
  Maximize2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Sliders,
  TrendingDown
} from 'lucide-react';
import { NormalizationSummary } from '../../types/dataset';
import { minMaxScale } from '../../utils/dataProcessing';
import { DataTable } from '../DataTable';

interface Step6NormalizationProps {
  currentRows: Record<string, any>[];
  targetColumn: string;
  isNormalized: boolean;
  onApplyNormalization: (
    normalizedRows: Record<string, any>[],
    summaries: NormalizationSummary[],
    scaledCols: string[]
  ) => void;
  onResetNormalization: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step6Normalization: React.FC<Step6NormalizationProps> = ({
  currentRows,
  targetColumn,
  isNormalized,
  onApplyNormalization,
  onResetNormalization,
  onNext,
  onPrev
}) => {
  // Find numeric columns eligible for Min-Max scaling
  // Typically exclude one-hot dummy columns (0/1) and target column if binary (0/1)
  const candidateNumericCols = useMemo(() => {
    if (!currentRows || currentRows.length === 0) return [];
    const keys = Object.keys(currentRows[0]);

    return keys.filter((key) => {
      if (key === targetColumn) return false;

      // Check if all non-null values are numeric
      const vals = currentRows.map((r) => Number(r[key])).filter((v) => !isNaN(v));
      if (vals.length === 0) return false;

      // If it's already strictly binary 0/1 dummy feature, we can exclude it by default or let user choose
      const isBinary01 = vals.every((v) => v === 0 || v === 1);
      return !isBinary01;
    });
  }, [currentRows, targetColumn]);

  const [selectedColsToScale, setSelectedColsToScale] = useState<string[]>(candidateNumericCols);

  const toggleScaleCol = (colName: string) => {
    setSelectedColsToScale((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Perform scaling calculation
  const { normalized, summaries } = useMemo(() => {
    return minMaxScale(currentRows, selectedColsToScale);
  }, [currentRows, selectedColsToScale]);

  const handleApply = () => {
    onApplyNormalization(normalized, summaries, selectedColsToScale);
  };

  return (
    <div className="space-y-6">
      {/* Header Intro */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <Maximize2 className="w-4 h-4" />
            <span>Step 6 · Feature Scaling</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Min-Max Normalization</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Scales numerical features into a bounded range of <code>[0.0, 1.0]</code>. Prevents high-magnitude features 
            (like Monthly Income $15,000) from disproportionately dominating distance metrics (KNN, SVM, K-Means) and gradient updates.
          </p>
        </div>

        {isNormalized ? (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Features Scaled [0, 1]</span>
            </span>
            <button
              onClick={onResetNormalization}
              className="p-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Reset normalization"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleApply}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Min-Max Normalization</span>
          </button>
        )}
      </div>

      {/* Formula & Feature Selection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
              Mathematical Transformation
            </span>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 font-mono text-xs text-center text-indigo-200 my-2">
              x&apos; = (x - min) / (max - min)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              Every value is transformed relative to the column&apos;s extreme limits. The minimum maps to <code>0.0</code> and maximum maps to <code>1.0</code>, preserving original linear relationships while standardizing scale.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Range:</span>
            <span className="font-mono text-emerald-400 font-bold">[0.0000, 1.0000]</span>
          </div>
        </div>

        {/* Column Selectors */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Select Continuous Numerical Features to Scale</span>
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {selectedColsToScale.length} selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              One-hot binary columns are already in [0, 1]. Select continuous multi-valued features to apply scaling.
            </p>

            <div className="flex flex-wrap gap-2">
              {candidateNumericCols.map((colName) => {
                const isSelected = selectedColsToScale.includes(colName);
                return (
                  <button
                    key={colName}
                    onClick={() => toggleScaleCol(colName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{colName}</span>
                    {isSelected && <CheckCircle className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span className="text-[11px]">Target column ({targetColumn}) is preserved in original ML scale.</span>
            <button
              onClick={() => setSelectedColsToScale(candidateNumericCols)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Select All
            </button>
          </div>
        </div>
      </div>

      {/* Before / After Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>Before vs After Scaling Summary Table</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of original distributions against scaled ranges
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            Normalized to [0.0 - 1.0]
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Feature Name</th>
                <th className="py-2.5 px-4 font-semibold text-right">Original Min</th>
                <th className="py-2.5 px-4 font-semibold text-right">Original Max</th>
                <th className="py-2.5 px-4 font-semibold text-right">Original Mean</th>
                <th className="py-2.5 px-4 font-semibold text-right">Original Median</th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700 bg-emerald-50/40">
                  Scaled Min
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700 bg-emerald-50/40">
                  Scaled Max
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700 bg-emerald-50/40">
                  Scaled Mean
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700 bg-emerald-50/40">
                  Scaled Median
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {summaries.map((summary) => (
                <tr key={summary.column} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{summary.column}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{summary.originalMin}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{summary.originalMax}</td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{summary.originalMean}</td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{summary.originalMedian}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 bg-emerald-50/20">
                    {summary.scaledMin.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 bg-emerald-50/20">
                    {summary.scaledMax.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-800 bg-emerald-50/20">
                    {summary.scaledMean.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-800 bg-emerald-50/20">
                    {summary.scaledMedian.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Scaled Dataset */}
      <DataTable
        rows={isNormalized ? currentRows : normalized}
        title={isNormalized ? 'Active Scaled Dataset' : 'Live Normalization Preview'}
        subtitle="Observe how continuous features are now cleanly bound between 0.0 and 1.0."
        defaultPageSize={10}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Encoding</span>
        </button>

        <div className="flex items-center space-x-3">
          {!isNormalized && (
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Scaling</span>
            </button>
          )}
          <button
            onClick={onNext}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <span>Proceed to Feature Correlation (Step 7)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
