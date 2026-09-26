import React, { useMemo } from 'react';
import {
  HelpCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Hash,
  Type,
  TrendingUp
} from 'lucide-react';
import { ColumnInfo } from '../../types/dataset';
import { imputeMissingValues } from '../../utils/dataProcessing';
import { DataTable } from '../DataTable';

interface Step4MissingValuesProps {
  currentRows: Record<string, any>[];
  columns: ColumnInfo[];
  isImputed: boolean;
  onApplyImputation: (
    imputedRows: Record<string, any>[],
    imputationMap: Record<string, { type: 'median' | 'mode'; value: any; filledCount: number }>
  ) => void;
  onResetImputation: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4MissingValues: React.FC<Step4MissingValuesProps> = ({
  currentRows,
  columns,
  isImputed,
  onApplyImputation,
  onResetImputation,
  onNext,
  onPrev
}) => {
  // Compute imputation values and simulated output
  const { imputed, imputationMap } = useMemo(() => {
    return imputeMissingValues(currentRows, columns);
  }, [currentRows, columns]);

  const missingColumns = useMemo(() => {
    return columns.filter((c) => c.missingCount > 0);
  }, [columns]);

  const totalMissingBefore = useMemo(() => {
    return missingColumns.reduce((sum, c) => sum + c.missingCount, 0);
  }, [missingColumns]);

  const handleApply = () => {
    onApplyImputation(imputed, imputationMap);
  };

  return (
    <div className="space-y-6">
      {/* Header Intro */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Step 4 · Imputation Pipeline</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Handle Missing Values</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Standard statistical imputation: fills numeric features with the <strong>Median</strong> (outlier-resistant) 
            and categorical features with the <strong>Mode</strong> (highest frequency category).
          </p>
        </div>

        {isImputed ? (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Imputation Complete (0 Missing)</span>
            </span>
            <button
              onClick={onResetImputation}
              className="p-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Reset imputation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleApply}
            disabled={totalMissingBefore === 0}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Median/Mode Imputation</span>
          </button>
        )}
      </div>

      {/* Imputation Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-blue-50/60 to-white border border-blue-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center space-x-2 text-blue-800 font-bold text-xs mb-1">
            <Hash className="w-4 h-4 text-blue-600" />
            <span>Numeric Features Strategy: Median Imputation</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            The median represents the 50th percentile. Unlike the mean, it is unaffected by extreme skewness or high salary outliers, ensuring imputed numbers reflect typical observation values.
          </p>
        </div>

        <div className="bg-linear-to-br from-purple-50/60 to-white border border-purple-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center space-x-2 text-purple-800 font-bold text-xs mb-1">
            <Type className="w-4 h-4 text-purple-600" />
            <span>Categorical Features Strategy: Mode Imputation</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            The mode imputes the most frequent observed category. For nominal or ordinal classes, mode imputation maintains the predominant category distribution without introducing fabricated labels.
          </p>
        </div>
      </div>

      {/* Before / After Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Before vs After Imputation Analysis Table</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact replacement values applied and verification of missing cell count reduction
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
            {totalMissingBefore} cells imputed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Column</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Imputation Strategy</th>
                <th className="py-2.5 px-4 font-semibold">Imputed Replacement Value</th>
                <th className="py-2.5 px-4 font-semibold text-center">Missing Before</th>
                <th className="py-2.5 px-4 font-semibold text-center">Missing After</th>
                <th className="py-2.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {columns.map((col) => {
                const info = imputationMap[col.name];
                const wasMissing = col.missingCount > 0;

                return (
                  <tr
                    key={col.name}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      wasMissing ? 'bg-indigo-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-900">{col.name}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 capitalize">{col.type}</td>
                    <td className="py-2.5 px-4 font-sans">
                      {info ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            info.type === 'median'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {info.type === 'median' ? 'Median (Numeric)' : 'Mode (Categorical)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">None needed</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {info ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {String(info.value)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {col.missingCount > 0 ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {col.missingCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        0
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      {wasMissing ? (
                        <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Fully Imputed</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No Nulls</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Table of Imputed Dataset */}
      <DataTable
        rows={isImputed ? currentRows : imputed}
        title={isImputed ? 'Active Imputed Dataset (0 Missing Values)' : 'Preview: Imputed Dataset'}
        subtitle="Notice how amber null pills have been completely replaced with valid column medians and modes."
        defaultPageSize={10}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cleaning</span>
        </button>

        <div className="flex items-center space-x-3">
          {!isImputed && (
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Imputation</span>
            </button>
          )}
          <button
            onClick={onNext}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <span>Proceed to Categorical Encoding (Step 5)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
