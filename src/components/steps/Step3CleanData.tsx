import React, { useState, useMemo } from 'react';
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { ColumnInfo, InvalidRule } from '../../types/dataset';
import {
  cleanTextCategoricals,
  detectInvalidRules,
  convertInvalidsToMissing,
  dropColumns
} from '../../utils/dataProcessing';
import { DataTable } from '../DataTable';

interface Step3CleanDataProps {
  currentRows: Record<string, any>[];
  columns: ColumnInfo[];
  isCleaned: boolean;
  onApplyCleaning: (
    cleanedRows: Record<string, any>[],
    droppedCols: string[],
    textCleanedCount: number,
    invalidsConvertedCount: number,
    corrections: { col: string; before: string; after: string }[]
  ) => void;
  onResetCleaning: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3CleanData: React.FC<Step3CleanDataProps> = ({
  currentRows,
  columns,
  isCleaned,
  onApplyCleaning,
  onResetCleaning,
  onNext,
  onPrev
}) => {
  // 1. Text standardization config
  const categoricalCols = useMemo(() => {
    return columns.filter((c) => c.type === 'categorical' || c.type === 'boolean').map((c) => c.name);
  }, [columns]);
  const [standardizeText, setStandardizeText] = useState(true);

  // 2. Invalid rules detection
  const detectedRules = useMemo(() => {
    return detectInvalidRules(currentRows, columns);
  }, [currentRows, columns]);
  const [convertInvalids, setConvertInvalids] = useState(true);

  // 3. Drop columns selection (pre-select recommended ID / constant columns)
  const recommendedDrops = useMemo(() => {
    return columns.filter((c) => c.isRecommendedDrop).map((c) => c.name);
  }, [columns]);

  const [selectedDrops, setSelectedDrops] = useState<string[]>(recommendedDrops);

  const toggleDropCol = (colName: string) => {
    setSelectedDrops((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Preview before applying
  const previewResult = useMemo(() => {
    let tempRows = currentRows.map((r) => ({ ...r }));
    let textAffected = 0;
    let sampleCorrections: { col: string; before: string; after: string }[] = [];

    if (standardizeText) {
      const res = cleanTextCategoricals(tempRows, categoricalCols);
      tempRows = res.cleaned;
      textAffected = res.affectedCount;
      sampleCorrections = res.sampleCorrections;
    }

    let invalidsConverted = 0;
    if (convertInvalids && detectedRules.length > 0) {
      const res = convertInvalidsToMissing(tempRows, detectedRules);
      tempRows = res.cleaned;
      invalidsConverted = res.convertedCount;
    }

    if (selectedDrops.length > 0) {
      tempRows = dropColumns(tempRows, selectedDrops);
    }

    return {
      previewRows: tempRows,
      textAffected,
      sampleCorrections,
      invalidsConverted
    };
  }, [currentRows, categoricalCols, standardizeText, convertInvalids, detectedRules, selectedDrops]);

  const handleApply = () => {
    onApplyCleaning(
      previewResult.previewRows,
      selectedDrops,
      previewResult.textAffected,
      previewResult.invalidsConverted,
      previewResult.sampleCorrections
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Intro */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <Wrench className="w-4 h-4" />
            <span>Step 3 · Data Hygiene</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Data Cleaning & Hygiene</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Standardize messy strings and whitespace, detect domain-invalid numeric values (like negative age or income) 
            and convert them to missing, and eliminate high-cardinality ID features.
          </p>
        </div>

        {isCleaned ? (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Cleaning Applied</span>
            </span>
            <button
              onClick={onResetCleaning}
              className="p-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Reset cleaning to raw state"
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
            <span>Apply Cleaning Pipeline</span>
          </button>
        )}
      </div>

      {/* Grid of 3 Cleaning Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Text Casing & Whitespace Standardization */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Text Standardization
              </span>
              <input
                type="checkbox"
                id="stdText"
                checked={standardizeText}
                onChange={(e) => setStandardizeText(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Trims trailing/leading whitespace and standardizes casing (e.g. &quot; Sales &quot; and &quot;sales&quot; become canonical &quot;Sales&quot;) so one-hot encoders don&apos;t create duplicated split categories.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-600 block">Sample Corrections:</span>
              {previewResult.sampleCorrections.length > 0 ? (
                previewResult.sampleCorrections.map((corr, idx) => (
                  <div key={idx} className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-rose-600 bg-rose-50 px-1 rounded line-through">
                      &quot;{corr.before}&quot;
                    </span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-semibold">
                      &quot;{corr.after}&quot;
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-[11px] italic">
                  Categorical values are already cleanly formatted.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Affected rows:</span>
            <span className="font-bold text-indigo-600 font-mono">
              {previewResult.textAffected} instances
            </span>
          </div>
        </div>

        {/* 2. Invalid Values Detection & Flagging */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span>2. Flag Invalid Values</span>
              </span>
              <input
                type="checkbox"
                id="convInv"
                checked={convertInvalids}
                onChange={(e) => setConvertInvalids(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Detects domain impossible numbers (e.g. negative Age or Monthly Income) and flags them, converting them to missing (NaN) for clean statistical imputation.
            </p>

            <div className="space-y-2">
              {detectedRules.length > 0 ? (
                detectedRules.map((rule) => (
                  <div
                    key={rule.column}
                    className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-rose-900">{rule.column}</span>
                      <span className="text-rose-700 font-semibold bg-rose-100 px-1.5 py-0.5 rounded text-[11px]">
                        {rule.flaggedCount} negative invalid
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-700 mt-1">
                      Invalid samples: {rule.sampleInvalidValues.map((v) => `${v}`).join(', ')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>No negative anomalies detected in positive features.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>To convert to NaN:</span>
            <span className="font-bold text-rose-600 font-mono">
              {previewResult.invalidsConverted} values
            </span>
          </div>
        </div>

        {/* 3. Drop Irrelevant Columns */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>3. Drop Irrelevant Columns</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                {selectedDrops.length} selected
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Remove unique row IDs, tracking tokens, or zero-variance columns that create spurious correlations or data leakage.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {columns.map((col) => {
                const isSelected = selectedDrops.includes(col.name);
                return (
                  <label
                    key={col.name}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-rose-50 text-rose-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDropCol(col.name)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-mono truncate">{col.name}</span>
                    </div>
                    {col.isRecommendedDrop && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded shrink-0">
                        ID
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setSelectedDrops(recommendedDrops)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Select recommended IDs
            </button>
            <button
              onClick={() => setSelectedDrops([])}
              className="text-[11px] text-slate-600 hover:text-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table of Cleaned Data */}
      <DataTable
        rows={isCleaned ? currentRows : previewResult.previewRows}
        title={isCleaned ? 'Active Cleaned Dataset' : 'Live Cleaning Preview (Click Apply to save)'}
        subtitle="Review dataset changes. Notice that negative numbers are turned to nulls, text is standardized, and selected ID columns are removed."
        defaultPageSize={10}
        droppedColumns={selectedDrops}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to EDA</span>
        </button>

        <div className="flex items-center space-x-3">
          {!isCleaned && (
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          )}
          <button
            onClick={onNext}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <span>Proceed to Missing Value Imputation (Step 4)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
