import React, { useState, useMemo } from 'react';
import {
  Binary,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { ColumnInfo, OrdinalMapping } from '../../types/dataset';
import { encodeCategoricals } from '../../utils/dataProcessing';
import { DataTable } from '../DataTable';

interface Step5CategoricalEncodingProps {
  currentRows: Record<string, any>[];
  columns: ColumnInfo[];
  targetColumn: string;
  isEncoded: boolean;
  onApplyEncoding: (
    encodedRows: Record<string, any>[],
    nominalCols: string[],
    ordinalMappings: OrdinalMapping[],
    dummyColumnsMap: Record<string, string[]>,
    labelMappings: Record<string, Record<string, number>>
  ) => void;
  onResetEncoding: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step5CategoricalEncoding: React.FC<Step5CategoricalEncodingProps> = ({
  currentRows,
  columns,
  targetColumn,
  isEncoded,
  onApplyEncoding,
  onResetEncoding,
  onNext,
  onPrev
}) => {
  // Find all categorical / text columns (excluding target from one-hot/ordinal if target is binary)
  const candidateCategoricals = useMemo(() => {
    return columns
      .filter((c) => c.type === 'categorical' || c.type === 'boolean')
      .map((c) => c.name);
  }, [columns]);

  // Initial smart categorization: columns with ordered semantic meanings are pre-suggested as ordinal
  const initialOrdinals = useMemo(() => {
    return candidateCategoricals.filter((colName) => {
      const lower = colName.toLowerCase();
      return (
        lower.includes('education') ||
        lower.includes('rating') ||
        lower.includes('level') ||
        lower.includes('travel') ||
        lower.includes('grade') ||
        lower.includes('tier')
      );
    });
  }, [candidateCategoricals]);

  // State: Set of columns marked as ordinal
  const [ordinalCols, setOrdinalCols] = useState<string[]>(initialOrdinals);

  // Default orders for ordinal candidates
  const [ordinalOrderings, setOrdinalOrderings] = useState<Record<string, string[]>>(() => {
    const orders: Record<string, string[]> = {};
    for (const colName of candidateCategoricals) {
      const uniqueVals = Array.from(
        new Set(currentRows.map((r) => String(r[colName]).trim()))
      ).filter(Boolean);

      // Pre-sort known orders if matched
      const lower = colName.toLowerCase();
      if (lower.includes('education')) {
        const orderWeight: Record<string, number> = {
          'high school': 0,
          college: 1,
          bachelor: 2,
          master: 3,
          doctorate: 4,
          phd: 4
        };
        uniqueVals.sort((a, b) => (orderWeight[a.toLowerCase()] ?? 99) - (orderWeight[b.toLowerCase()] ?? 99));
      } else if (lower.includes('rating')) {
        const orderWeight: Record<string, number> = {
          low: 0,
          below: 1,
          good: 2,
          excellent: 3,
          outstanding: 4
        };
        uniqueVals.sort((a, b) => (orderWeight[a.toLowerCase()] ?? 99) - (orderWeight[b.toLowerCase()] ?? 99));
      } else if (lower.includes('travel')) {
        const orderWeight: Record<string, number> = {
          'non-travel': 0,
          travel_rarely: 1,
          travel_frequently: 2
        };
        uniqueVals.sort((a, b) => (orderWeight[a.toLowerCase()] ?? 99) - (orderWeight[b.toLowerCase()] ?? 99));
      } else {
        uniqueVals.sort();
      }

      orders[colName] = uniqueVals;
    }
    return orders;
  });

  // Nominal columns are categorical columns not marked as ordinal and not the target
  const nominalCols = useMemo(() => {
    return candidateCategoricals.filter(
      (c) => !ordinalCols.includes(c) && c !== targetColumn
    );
  }, [candidateCategoricals, ordinalCols, targetColumn]);

  // Construct OrdinalMapping objects
  const ordinalMappings = useMemo((): OrdinalMapping[] => {
    return ordinalCols.map((col) => {
      const order = ordinalOrderings[col] || [];
      const mapping: Record<string, number> = {};
      order.forEach((val, idx) => {
        mapping[val] = idx;
      });
      return { column: col, order, mapping };
    });
  }, [ordinalCols, ordinalOrderings]);

  // Reorder items in ordinal list
  const moveOrdinalItem = (col: string, idx: number, direction: 'up' | 'down') => {
    const current = [...(ordinalOrderings[col] || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;

    const temp = current[idx];
    current[idx] = current[targetIdx];
    current[targetIdx] = temp;

    setOrdinalOrderings((prev) => ({
      ...prev,
      [col]: current
    }));
  };

  const toggleOrdinalType = (colName: string) => {
    setOrdinalCols((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  // Compute live encoding output
  const { encoded, dummyColumnsMap, labelMappings, targetMapping } = useMemo(() => {
    return encodeCategoricals(currentRows, nominalCols, ordinalMappings, targetColumn);
  }, [currentRows, nominalCols, ordinalMappings, targetColumn]);

  const handleApply = () => {
    onApplyEncoding(encoded, nominalCols, ordinalMappings, dummyColumnsMap, labelMappings);
  };

  return (
    <div className="space-y-6">
      {/* Header Intro */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <Binary className="w-4 h-4" />
            <span>Step 5 · Feature Vectorization</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Encode Categorical Features</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Machine Learning algorithms require numeric matrices. Convert qualitative data into numbers using{' '}
            <strong>One-Hot Encoding</strong> for nominal attributes and <strong>Ordinal Encoding</strong> with custom ranking for hierarchy attributes.
          </p>
        </div>

        {isEncoded ? (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Features Encoded</span>
            </span>
            <button
              onClick={onResetEncoding}
              className="p-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Reset encoding"
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
            <span>Apply Categorical Encoding</span>
          </button>
        )}
      </div>

      {/* Target Column Binary Encoding Card */}
      {targetMapping && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Binary className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-950">
                Target Variable Binary Encoding: <code>{targetColumn}</code>
              </span>
              <p className="text-xs text-indigo-800 mt-0.5">
                Automatically converted 2-class target to standard ML binary values (0 and 1)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
            {Object.entries(targetMapping).map(([k, v], i) => (
              <span key={k}>
                {i > 0 && <span className="text-slate-400 mx-1.5">|</span>}
                <span className="text-slate-700">&quot;{k}&quot;</span> ➔ <span className="text-indigo-600">{v}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Categorical Columns Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Nominal Column Configuration (One-Hot) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Nominal Features (One-Hot Encoding)</span>
              </h3>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {nominalCols.length} features
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Categories without inherent order (e.g. Department, JobRole). Converts each distinct category into an independent binary 0/1 column.
            </p>

            <div className="space-y-3">
              {nominalCols.map((colName) => {
                const dummies = dummyColumnsMap[colName] || [];
                return (
                  <div key={colName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center justify-between font-mono mb-1.5">
                      <span className="font-bold text-slate-800">{colName}</span>
                      <button
                        onClick={() => toggleOrdinalType(colName)}
                        className="text-[11px] font-sans text-indigo-600 hover:text-indigo-800 underline font-medium"
                      >
                        Change to Ordinal
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-1.5">
                      Creates {dummies.length} dummy columns:
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono">
                      {dummies.map((d) => (
                        <span
                          key={d}
                          className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {nominalCols.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                  No columns currently selected for one-hot encoding.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ordinal Column Configuration (Custom Order) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Ordinal Features (Label Order Specification)</span>
              </h3>
              <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {ordinalCols.length} features
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Categories with natural ranking. Specify order from lowest (0) to highest (N-1) using the arrow buttons.
            </p>

            <div className="space-y-4">
              {ordinalCols.map((colName) => {
                const order = ordinalOrderings[colName] || [];
                return (
                  <div key={colName} className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl text-xs">
                    <div className="flex items-center justify-between font-mono mb-2">
                      <span className="font-bold text-purple-950">{colName}</span>
                      <button
                        onClick={() => toggleOrdinalType(colName)}
                        className="text-[11px] font-sans text-slate-500 hover:text-slate-700 underline"
                      >
                        Change to One-Hot
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {order.map((item, idx) => (
                        <div
                          key={item}
                          className="flex items-center justify-between bg-white border border-purple-100 rounded-lg px-2.5 py-1 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold flex items-center justify-center">
                              {idx}
                            </span>
                            <span className="font-medium text-slate-800">{item}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => moveOrdinalItem(colName, idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors"
                              title="Move up in rank"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveOrdinalItem(colName, idx, 'down')}
                              disabled={idx === order.length - 1}
                              className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-600 transition-colors"
                              title="Move down in rank"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {ordinalCols.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                  No ordinal columns configured. Click &quot;Change to Ordinal&quot; on any nominal feature to set custom hierarchy ranking.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Encoded Dataset */}
      <DataTable
        rows={isEncoded ? currentRows : encoded}
        title={isEncoded ? 'Active Encoded Dataset' : 'Live Encoding Preview'}
        subtitle="Notice all categorical variables have been transformed into purely numeric matrices (integers and 0/1 binary flags)."
        defaultPageSize={10}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Imputation</span>
        </button>

        <div className="flex items-center space-x-3">
          {!isEncoded && (
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Encoding</span>
            </button>
          )}
          <button
            onClick={onNext}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <span>Proceed to Min-Max Normalization (Step 6)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
