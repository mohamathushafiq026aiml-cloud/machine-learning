import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  HelpCircle,
  Hash,
  Scale,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ColumnInfo } from '../../types/dataset';
import { getNumericStats, getCategoricalStats } from '../../utils/dataProcessing';

interface Step2EDAProps {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  targetColumn: string;
  onSetTargetColumn: (col: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step2EDA: React.FC<Step2EDAProps> = ({
  rows,
  columns,
  targetColumn,
  onSetTargetColumn,
  onNext,
  onPrev
}) => {
  const [selectedInspectCat, setSelectedInspectCat] = useState<string>(targetColumn || '');

  // Calculate missing counts for all columns
  const missingData = useMemo(() => {
    return columns.map((col) => {
      const rate = rows.length > 0 ? (col.missingCount / rows.length) * 100 : 0;
      return {
        name: col.name,
        type: col.type,
        missingCount: col.missingCount,
        rate: Number(rate.toFixed(1))
      };
    }).sort((a, b) => b.missingCount - a.missingCount);
  }, [columns, rows]);

  // Compute numeric statistics
  const numericColumns = useMemo(() => {
    return columns.filter((c) => c.type === 'numeric').map((c) => c.name);
  }, [columns]);

  const numericStats = useMemo(() => {
    return numericColumns.map((colName) => getNumericStats(rows, colName));
  }, [numericColumns, rows]);

  // Categorical columns for inspection & target selection
  const categoricalColumns = useMemo(() => {
    return columns.filter((c) => c.type === 'categorical' || c.type === 'boolean').map((c) => c.name);
  }, [columns]);

  // Current active target stats
  const activeTargetStats = useMemo(() => {
    if (!targetColumn) return null;
    return getCategoricalStats(rows, targetColumn);
  }, [rows, targetColumn]);

  // Current inspected categorical stats (if different from target)
  const currentInspectCol = selectedInspectCat || targetColumn || (categoricalColumns[0] ?? '');
  const currentInspectStats = useMemo(() => {
    if (!currentInspectCol) return null;
    return getCategoricalStats(rows, currentInspectCol);
  }, [rows, currentInspectCol]);

  // Check if target is imbalanced
  const isTargetImbalanced = useMemo(() => {
    if (!activeTargetStats || activeTargetStats.frequencies.length < 2) return false;
    const minFreq = Math.min(...activeTargetStats.frequencies.map((f) => f.percentage));
    return minFreq < 25; // Less than 25% indicates notable class imbalance
  }, [activeTargetStats]);

  return (
    <div className="space-y-6">
      {/* Header Introduction */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Step 2 · Data Understanding</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Exploratory Data Analysis (EDA)</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Diagnose missingness patterns across features, inspect statistical central tendencies (mean vs median), 
            and evaluate class distribution balance for supervised Machine Learning.
          </p>
        </div>

        {/* Target Selector */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl min-w-[240px]">
          <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>ML Target Column</span>
            <span className="text-[10px] text-indigo-600 font-normal">Supervised Y</span>
          </label>
          <select
            value={targetColumn}
            onChange={(e) => {
              onSetTargetColumn(e.target.value);
              setSelectedInspectCat(e.target.value);
            }}
            className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Missing Values Overview Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>Missing Value Analysis per Column</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies columns requiring imputation before training ML models (e.g. Scikit-learn estimators cannot handle NaN values natively)
            </p>
          </div>
          <div className="text-xs font-medium text-slate-600">
            Total Missing:{' '}
            <span className="font-mono font-bold text-amber-600">
              {columns.reduce((a, b) => a + b.missingCount, 0)} cells
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {missingData.map((item) => (
            <div
              key={item.name}
              className={`p-3 rounded-xl border transition-all ${
                item.missingCount > 0
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold font-mono text-slate-800">{item.name}</span>
                <span
                  className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded-full ${
                    item.missingCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.missingCount} missing ({item.rate}%)
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.missingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(item.rate, item.missingCount > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Numeric Columns Basic Statistics */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Hash className="w-4 h-4 text-blue-500" />
              <span>Basic Descriptive Statistics for Numeric Features</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Measures of central tendency (Mean vs Median), spread (Min, Max, Std Dev), and quartile boundaries
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
            {numericColumns.length} Numeric Features
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Feature</th>
                <th className="py-2.5 px-4 font-semibold text-right">Count</th>
                <th className="py-2.5 px-4 font-semibold text-right">Missing</th>
                <th className="py-2.5 px-4 font-semibold text-right">Mean (μ)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Median</th>
                <th className="py-2.5 px-4 font-semibold text-right">Min</th>
                <th className="py-2.5 px-4 font-semibold text-right">Max</th>
                <th className="py-2.5 px-4 font-semibold text-right">Std Dev (σ)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Q25 / Q75</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {numericStats.map((stat) => {
                const isMinNegative = stat.min < 0;
                return (
                  <tr key={stat.column} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{stat.column}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{stat.count}</td>
                    <td className="py-2.5 px-4 text-right">
                      {stat.missing > 0 ? (
                        <span className="text-amber-700 font-semibold">{stat.missing}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-800 font-semibold">{stat.mean}</td>
                    <td className="py-2.5 px-4 text-right text-slate-800">{stat.median}</td>
                    <td className="py-2.5 px-4 text-right">
                      {isMinNegative ? (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {stat.min} ⚠
                        </span>
                      ) : (
                        <span className="text-slate-700">{stat.min}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{stat.max}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">{stat.stdDev}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">
                      {stat.q25} / {stat.q75}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {numericStats.some((s) => s.min < 0) && (
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Data anomaly detected:</strong> Features like{' '}
              {numericStats.filter((s) => s.min < 0).map((s) => s.column).join(', ')} contain negative minimum values.
              Step 3 will automatically detect and convert these invalid values to missing (NaN) for clean imputation.
            </span>
          </div>
        )}
      </div>

      {/* 3. Class Balance Breakdown for Target & Categoricals */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <span>Categorical Distribution & Target Class Balance</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect class proportions to avoid class imbalance biases in classification algorithms
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Inspect Column:</span>
            <select
              value={currentInspectCol}
              onChange={(e) => setSelectedInspectCat(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
            >
              {categoricalColumns.map((c) => (
                <option key={c} value={c}>
                  {c} {c === targetColumn ? '★ (Target)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentInspectStats && (
          <div className="space-y-4">
            {/* Visual Class Balance Bars */}
            <div className="space-y-2.5">
              {currentInspectStats.frequencies.map((item, index) => {
                const colors = [
                  'bg-indigo-600 text-indigo-700',
                  'bg-emerald-500 text-emerald-700',
                  'bg-amber-500 text-amber-700',
                  'bg-rose-500 text-rose-700',
                  'bg-purple-500 text-purple-700'
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <div key={item.value} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{item.value}</span>
                        {item.value === currentInspectStats.mode && (
                          <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                            Mode
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-slate-600">{item.count} samples</span>
                        <span className="font-bold text-slate-900">({item.percentage}%)</span>
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass.split(' ')[0]}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Imbalance Advice if target column */}
            {currentInspectCol === targetColumn && isTargetImbalanced && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Machine Learning Class Imbalance Insight:</span>
                  <p className="mt-0.5 leading-relaxed text-amber-800">
                    The target class distribution for <code>{targetColumn}</code> is noticeably imbalanced. 
                    Standard accuracy scores may be misleading (a naive classifier predicting only the majority class would achieve high accuracy). 
                    Recommended strategies: evaluate with Precision-Recall AUC / F1-Score, apply Stratified K-Fold validation, or use class weights (`class_weight='balanced'`).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Load Overview</span>
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <span>Proceed to Data Cleaning (Step 3)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
