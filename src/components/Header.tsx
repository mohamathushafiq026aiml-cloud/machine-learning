import React from 'react';
import { Database, RotateCcw, FileSpreadsheet, Sparkles, CheckCircle2 } from 'lucide-react';
import { StepId } from '../types/dataset';

interface HeaderProps {
  datasetName: string;
  rowCount: number;
  colCount: number;
  currentStep: StepId;
  onReset: () => void;
  onLoadSample: () => void;
  onExportQuick: () => void;
  isPipelineComplete: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  datasetName,
  rowCount,
  colCount,
  onReset,
  onLoadSample,
  onExportQuick,
  isPipelineComplete
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Data Preprocessing Studio</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              ML Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500">Automated cleaning, statistical EDA, encoding & normalization for ML</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Dataset Info Chip */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-700 max-w-[140px] truncate">{datasetName}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-mono font-medium">{rowCount} rows</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-mono font-medium">{colCount} cols</span>
        </div>

        {/* Load Sample Button */}
        <button
          onClick={onLoadSample}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          title="Reload sample Employee Attrition dataset"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Sample Dataset</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
          title="Reset transformations to original raw dataset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Pipeline</span>
        </button>

        {/* Quick Export Button */}
        <button
          onClick={onExportQuick}
          className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
            isPipelineComplete
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isPipelineComplete ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Export Ready</span>
            </>
          ) : (
            <span>Export CSV</span>
          )}
        </button>
      </div>
    </header>
  );
};
