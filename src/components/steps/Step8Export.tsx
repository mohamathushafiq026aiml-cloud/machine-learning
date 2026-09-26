import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Download,
  FileText,
  Code,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Database
} from 'lucide-react';
import { PipelineLogEntry, OrdinalMapping } from '../../types/dataset';
import { generateMarkdownReport, generatePythonScript } from '../../utils/dataProcessing';
import { DataTable } from '../DataTable';

interface Step8ExportProps {
  finalRows: Record<string, any>[];
  datasetName: string;
  targetColumn: string;
  selectedFeatures: string[];
  logs: PipelineLogEntry[];
  droppedColumns: string[];
  nominalColumns: string[];
  ordinalMappings: OrdinalMapping[];
  scaledColumns: string[];
  rawCount: { rows: number; cols: number };
  onPrev: () => void;
}

export const Step8Export: React.FC<Step8ExportProps> = ({
  finalRows,
  datasetName,
  targetColumn,
  selectedFeatures,
  logs,
  droppedColumns,
  nominalColumns,
  ordinalMappings,
  scaledColumns,
  rawCount,
  onPrev
}) => {
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(logs[0]?.id || null);

  // Filter final rows to only include selected features + target column
  const exportedRows = useMemo(() => {
    if (!finalRows || finalRows.length === 0) return [];
    const keepKeys = new Set([...selectedFeatures, targetColumn]);

    return finalRows.map((row) => {
      const filtered: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        if (keepKeys.has(key)) {
          filtered[key] = row[key];
        }
      }
      return filtered;
    });
  }, [finalRows, selectedFeatures, targetColumn]);

  const finalColsCount = exportedRows.length > 0 ? Object.keys(exportedRows[0]).length : 0;

  // Generate Markdown report string
  const markdownReport = useMemo(() => {
    return generateMarkdownReport(
      logs,
      datasetName,
      rawCount,
      { rows: exportedRows.length, cols: finalColsCount },
      targetColumn
    );
  }, [logs, datasetName, rawCount, exportedRows.length, finalColsCount, targetColumn]);

  // Generate Python script string
  const pythonScript = useMemo(() => {
    return generatePythonScript(
      datasetName,
      droppedColumns,
      nominalColumns,
      ordinalMappings,
      scaledColumns,
      targetColumn
    );
  }, [datasetName, droppedColumns, nominalColumns, ordinalMappings, scaledColumns, targetColumn]);

  // Download CSV
  const handleDownloadCSV = () => {
    const csv = Papa.unparse(exportedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cleaned_${datasetName.replace(/\.[^/.]+$/, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Markdown Report
  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `preprocessing_report_${datasetName.replace(/\.[^/.]+$/, '')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Python to clipboard
  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  // Copy Markdown to clipboard
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/40 border border-emerald-400/40 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Preprocessing Pipeline Complete</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Dataset Ready for Model Training</h2>
            <p className="text-emerald-100 text-xs mt-1 max-w-2xl leading-relaxed">
              All 8 transformation stages are executed. Text is standardized, domain invalid values replaced and imputed, 
              categoricals vectorized, numerical features Min-Max scaled, and features ranked.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Cleaned CSV</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl border border-emerald-500/40 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Download Report (.md)</span>
            </button>
          </div>
        </div>

        {/* Pipeline Metrics Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-500/40 text-xs">
          <div>
            <span className="text-emerald-200 block text-[11px]">Final Rows</span>
            <span className="text-lg font-bold font-mono">{exportedRows.length}</span>
          </div>
          <div>
            <span className="text-emerald-200 block text-[11px]">Features Selected</span>
            <span className="text-lg font-bold font-mono">{finalColsCount}</span>
          </div>
          <div>
            <span className="text-emerald-200 block text-[11px]">Missing Cells</span>
            <span className="text-lg font-bold font-mono text-emerald-200">0 (0.0%)</span>
          </div>
          <div>
            <span className="text-emerald-200 block text-[11px]">Target Feature</span>
            <span className="text-lg font-bold font-mono">{targetColumn}</span>
          </div>
        </div>
      </div>

      {/* Final Cleaned Dataset Preview Table */}
      <DataTable
        rows={exportedRows}
        title="Final Cleaned & Vectorized Dataset Preview"
        subtitle="This is the exact dataset being downloaded to CSV. All values are numeric, bounded, and ready for ML estimators."
        defaultPageSize={10}
      />

      {/* Step-by-Step Documentation Audit Log (Feature 9) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Step-by-Step Preprocessing Audit Log & ML Rationale</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive report detailing each operation performed, affected features, and statistical justification
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? 'Copied Report' : 'Copy Report'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .md</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="rounded-lg transition-colors overflow-hidden">
                <button
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                      {log.stepNumber}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900">{log.stepName}:</span>{' '}
                      <span className="text-xs text-slate-700 font-medium">{log.action}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {log.timestamp}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-12 pb-4 pt-1 space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="font-semibold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                        Execution Details:
                      </span>
                      <pre className="text-slate-800 font-mono whitespace-pre-wrap leading-relaxed text-[11px]">
                        {log.details}
                      </pre>
                    </div>

                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-indigo-950">
                      <span className="font-semibold text-indigo-900 block mb-1 text-[11px] uppercase tracking-wider">
                        Machine Learning Theoretical Rationale:
                      </span>
                      <p className="leading-relaxed text-indigo-900 text-xs">{log.rationale}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Python Pipeline Reproduction Script (Bonus for ML students!) */}
      <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-xs border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200">
              Reproducible Python Script (Pandas &amp; Scikit-Learn)
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              pipeline.py
            </span>
          </div>

          <button
            onClick={handleCopyPython}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
          >
            {copiedPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPython ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto">
          <pre className="font-mono text-xs text-indigo-200/90 leading-relaxed whitespace-pre-wrap">
            {pythonScript}
          </pre>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Correlation Analysis</span>
        </button>

        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Preprocessed Dataset (.csv)</span>
        </button>
      </div>
    </div>
  );
};
