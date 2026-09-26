import React from 'react';
import {
  FileText,
  BarChart3,
  Wrench,
  HelpCircle,
  Binary,
  Maximize2,
  GitFork,
  Download,
  CheckCircle,
  CircleDot
} from 'lucide-react';
import { StepId, StepDefinition } from '../types/dataset';

export const PIPELINE_STEPS: (StepDefinition & { icon: React.ElementType })[] = [
  {
    id: 'load',
    number: 1,
    name: 'Load & Overview',
    shortDesc: 'Upload CSV & examine schema',
    icon: FileText
  },
  {
    id: 'eda',
    number: 2,
    name: 'Exploratory Analysis',
    shortDesc: 'Missing rates, stats & class balance',
    icon: BarChart3
  },
  {
    id: 'clean',
    number: 3,
    name: 'Clean Data',
    shortDesc: 'Whitespace, invalids & drop IDs',
    icon: Wrench
  },
  {
    id: 'impute',
    number: 4,
    name: 'Impute Missing',
    shortDesc: 'Median (numeric) & mode (categorical)',
    icon: HelpCircle
  },
  {
    id: 'encode',
    number: 5,
    name: 'Encode Categoricals',
    shortDesc: 'One-hot nominal & ordinal mapping',
    icon: Binary
  },
  {
    id: 'normalize',
    number: 6,
    name: 'Normalize & Scale',
    shortDesc: 'Min-Max feature scaling [0, 1]',
    icon: Maximize2
  },
  {
    id: 'correlation',
    number: 7,
    name: 'Feature Selection',
    shortDesc: 'Correlation matrix & target ranking',
    icon: GitFork
  },
  {
    id: 'export',
    number: 8,
    name: 'Export & Report',
    shortDesc: 'Clean CSV, audit log & Python code',
    icon: Download
  }
];

interface SidebarProps {
  currentStep: StepId;
  onSelectStep: (step: StepId) => void;
  stepStatus: {
    isCleaned: boolean;
    isImputed: boolean;
    isEncoded: boolean;
    isNormalized: boolean;
  };
  metrics: {
    rows: number;
    cols: number;
    missingCells: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStep,
  onSelectStep,
  stepStatus,
  metrics
}) => {
  const isStepCompleted = (stepId: StepId): boolean => {
    switch (stepId) {
      case 'load':
      case 'eda':
        return true;
      case 'clean':
        return stepStatus.isCleaned;
      case 'impute':
        return stepStatus.isImputed;
      case 'encode':
        return stepStatus.isEncoded;
      case 'normalize':
        return stepStatus.isNormalized;
      case 'correlation':
        return stepStatus.isNormalized && stepStatus.isEncoded;
      case 'export':
        return false;
      default:
        return false;
    }
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] shrink-0 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span>Pipeline Stages</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">
              8 Steps
            </span>
          </div>

          <nav className="space-y-1">
            {PIPELINE_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const completed = isStepCompleted(step.id);

              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(step.id)}
                  className={`w-full group text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-start space-x-3 ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-200/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : completed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold truncate ${isActive ? 'text-indigo-950 font-bold' : ''}`}>
                        {step.number}. {step.name}
                      </span>
                      {completed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />
                      ) : isActive ? (
                        <CircleDot className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1 animate-pulse" />
                      ) : null}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-indigo-700/80' : 'text-slate-600'}`}>
                      {step.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dataset Health Summary Widget */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80">
        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Dataset Diagnostics
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-600 block">Total Rows</span>
            <span className="font-bold text-slate-800 font-mono text-sm">{metrics.rows}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-600 block">Features</span>
            <span className="font-bold text-slate-800 font-mono text-sm">{metrics.cols}</span>
          </div>
        </div>

        <div className="mt-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-600 block">Missing Cells</span>
            <span className={`font-bold font-mono text-sm ${metrics.missingCells > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {metrics.missingCells} {metrics.missingCells === 0 && '✓ Clean'}
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              metrics.missingCells === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {metrics.missingCells === 0 ? 'Ready' : 'Needs Imputation'}
          </span>
        </div>
      </div>
    </aside>
  );
};
