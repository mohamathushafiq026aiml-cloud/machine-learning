import React, { useState, useMemo } from 'react';
import {
  GitFork,
  ArrowRight,
  ArrowLeft,
  Filter,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers
} from 'lucide-react';
import { CorrelationResult } from '../../types/dataset';
import { calculateCorrelationsWithTarget, calculateCorrelationMatrix } from '../../utils/dataProcessing';

interface Step7CorrelationProps {
  currentRows: Record<string, any>[];
  targetColumn: string;
  onSetTargetColumn: (col: string) => void;
  selectedFeatures: string[];
  onUpdateSelectedFeatures: (features: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step7Correlation: React.FC<Step7CorrelationProps> = ({
  currentRows,
  targetColumn,
  onSetTargetColumn,
  selectedFeatures,
  onUpdateSelectedFeatures,
  onNext,
  onPrev
}) => {
  const [minCorrelationThreshold, setMinCorrelationThreshold] = useState<number>(0.0);
  const [showPairwiseHeatmap, setShowPairwiseHeatmap] = useState<boolean>(true);

  // Available numeric columns
  const allNumericCols = useMemo(() => {
    if (!currentRows || currentRows.length === 0) return [];
    return Object.keys(currentRows[0]).filter((k) => {
      return currentRows.some((r) => typeof r[k] === 'number' && !isNaN(r[k]));
    });
  }, [currentRows]);

  // Target correlations
  const correlations: CorrelationResult[] = useMemo(() => {
    return calculateCorrelationsWithTarget(currentRows, targetColumn);
  }, [currentRows, targetColumn]);

  // Pairwise correlation matrix for top features
  const matrixFeatures = useMemo(() => {
    // Select top 8-10 features for readable matrix display
    const topFeats = correlations.slice(0, 8).map((c) => c.feature);
    if (!topFeats.includes(targetColumn) && allNumericCols.includes(targetColumn)) {
      topFeats.unshift(targetColumn);
    }
    return topFeats;
  }, [correlations, targetColumn, allNumericCols]);

  const pairwiseMatrix = useMemo(() => {
    return calculateCorrelationMatrix(currentRows, matrixFeatures);
  }, [currentRows, matrixFeatures]);

  // Multicollinearity warnings (features correlated with each other > 0.75)
  const collinearPairs = useMemo(() => {
    const pairs: { f1: string; f2: string; r: number }[] = [];
    const feats = pairwiseMatrix.features;
    for (let i = 0; i < feats.length; i++) {
      for (let j = i + 1; j < feats.length; j++) {
        if (feats[i] !== targetColumn && feats[j] !== targetColumn) {
          const r = pairwiseMatrix.matrix[i][j];
          if (Math.abs(r) >= 0.7) {
            pairs.push({ f1: feats[i], f2: feats[j], r });
          }
        }
      }
    }
    return pairs;
  }, [pairwiseMatrix, targetColumn]);

  // Toggle single feature
  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      onUpdateSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
    } else {
      onUpdateSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  // Quick select by threshold
  const selectByThreshold = (threshold: number) => {
    setMinCorrelationThreshold(threshold);
    const qualified = correlations
      .filter((c) => c.absCorrelation >= threshold)
      .map((c) => c.feature);
    onUpdateSelectedFeatures(qualified);
  };

  // Color helper for heatmap cells
  const getCorrelationColor = (r: number) => {
    if (isNaN(r)) return 'bg-slate-100 text-slate-400';
    if (r >= 0.7) return 'bg-emerald-600 text-white font-bold';
    if (r >= 0.4) return 'bg-emerald-400 text-slate-900 font-semibold';
    if (r >= 0.15) return 'bg-emerald-100 text-emerald-900';
    if (r > -0.15) return 'bg-slate-50 text-slate-600';
    if (r > -0.4) return 'bg-rose-100 text-rose-900';
    if (r > -0.7) return 'bg-rose-400 text-white font-semibold';
    return 'bg-rose-600 text-white font-bold';
  };

  return (
    <div className="space-y-6">
      {/* Header Intro */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
            <GitFork className="w-4 h-4" />
            <span>Step 7 · Feature Selection</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Correlation Analysis & Feature Selection</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Quantify linear associations between input predictors and the target label (<code>{targetColumn}</code>). 
            Select influential features while pruning noisy, zero-correlation variables and diagnosing multicollinearity.
          </p>
        </div>

        {/* Target Column Selector */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center space-x-2 min-w-[220px]">
          <span className="text-xs text-slate-500 shrink-0">Target:</span>
          <select
            value={targetColumn}
            onChange={(e) => onSetTargetColumn(e.target.value)}
            className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none"
          >
            {allNumericCols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Selection Quick Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Quick Feature Filter:</span>
          <span className="text-xs text-slate-500">
            ({selectedFeatures.length} of {correlations.length} features active)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => selectByThreshold(0.0)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              minCorrelationThreshold === 0.0
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Features (|r| ≥ 0.0)
          </button>
          <button
            onClick={() => selectByThreshold(0.15)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              minCorrelationThreshold === 0.15
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Moderate+ (|r| ≥ 0.15)
          </button>
          <button
            onClick={() => selectByThreshold(0.3)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              minCorrelationThreshold === 0.3
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Strong Only (|r| ≥ 0.3)
          </button>
        </div>
      </div>

      {/* Multicollinearity Warning if detected */}
      {collinearPairs.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Multicollinearity Advisory (High Cross-Correlation):</span>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              The following feature pairs have strong correlation (|r| ≥ 0.70):{' '}
              {collinearPairs.map((p) => `${p.f1} ↔ ${p.f2} (r=${p.r})`).join(', ')}. 
              In linear models, high multicollinearity destabilizes coefficient estimates and inflates standard errors.
            </p>
          </div>
        </div>
      )}

      {/* Feature Correlation Ranked Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Feature Correlation with Target ({targetColumn})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by absolute Pearson correlation magnitude |r| with target
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateSelectedFeatures(correlations.map((c) => c.feature))}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => onUpdateSelectedFeatures([])}
              className="text-xs text-slate-500 hover:underline"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold text-center w-12">Keep</th>
                <th className="py-2.5 px-4 font-semibold">Feature</th>
                <th className="py-2.5 px-4 font-semibold text-right">Pearson (r)</th>
                <th className="py-2.5 px-4 font-semibold text-right">|r| Magnitude</th>
                <th className="py-2.5 px-4 font-semibold text-center">Direction</th>
                <th className="py-2.5 px-4 font-semibold">Predictive Strength</th>
                <th className="py-2.5 px-4 font-semibold">Visual Correlation Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {correlations.map((item) => {
                const isSelected = selectedFeatures.includes(item.feature);
                const absPercent = Math.min(item.absCorrelation * 100, 100);

                return (
                  <tr
                    key={item.feature}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isSelected ? 'bg-indigo-50/15' : 'opacity-60 bg-slate-50/20'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFeature(item.feature)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{item.feature}</td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold ${
                        item.correlation > 0 ? 'text-emerald-700' : item.correlation < 0 ? 'text-rose-700' : 'text-slate-600'
                      }`}
                    >
                      {item.correlation > 0 ? `+${item.correlation}` : item.correlation}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{item.absCorrelation}</td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      {item.direction === 'positive' ? (
                        <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> Positive
                        </span>
                      ) : item.direction === 'negative' ? (
                        <span className="inline-flex items-center text-rose-700 text-[11px] font-semibold">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> Negative
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Neutral</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.strength === 'strong'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.strength === 'moderate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.strength}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 w-44">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.correlation > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(absPercent, 6)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pairwise Correlation Heatmap Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Pairwise Feature Correlation Heatmap Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Heatmap representation of cross-feature interactions and target correlation
            </p>
          </div>

          <button
            onClick={() => setShowPairwiseHeatmap(!showPairwiseHeatmap)}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-50"
          >
            {showPairwiseHeatmap ? 'Collapse Matrix' : 'Expand Matrix'}
          </button>
        </div>

        {showPairwiseHeatmap && (
          <div className="p-4 overflow-x-auto">
            <table className="border-collapse text-xs font-mono mx-auto">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-400 font-sans text-[11px] max-w-[120px] truncate">
                    Feature
                  </th>
                  {pairwiseMatrix.features.map((feat) => (
                    <th
                      key={feat}
                      className="p-2 text-center text-slate-700 font-medium max-w-[80px] truncate text-[10px]"
                      title={feat}
                    >
                      {feat.length > 8 ? `${feat.substring(0, 7)}…` : feat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pairwiseMatrix.features.map((featRow, i) => (
                  <tr key={featRow}>
                    <td
                      className="p-2 text-right font-medium text-slate-700 max-w-[120px] truncate pr-3 text-[11px]"
                      title={featRow}
                    >
                      {featRow}
                    </td>
                    {pairwiseMatrix.features.map((featCol, j) => {
                      const r = pairwiseMatrix.matrix[i][j];
                      const colorClass = getCorrelationColor(r);

                      return (
                        <td
                          key={featCol}
                          className={`p-2 text-center border border-white text-[11px] rounded transition-transform hover:scale-105 cursor-default ${colorClass}`}
                          title={`${featRow} ↔ ${featCol}: ${r}`}
                        >
                          {r.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Heatmap Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center space-x-6 text-[11px] text-slate-500">
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block" />
                <span>Negative (-1.0 to -0.4)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block" />
                <span>Neutral (~0.0)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
                <span>Positive (+0.4 to +1.0)</span>
              </div>
            </div>
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
          <span>Back to Scaling</span>
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <span>Proceed to Export & Report (Step 8)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
