import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileSpreadsheet, Sparkles, AlertCircle, ArrowRight, Hash, Type, CheckCircle } from 'lucide-react';
import { ColumnInfo } from '../../types/dataset';
import { DataTable } from '../DataTable';

interface Step1LoadOverviewProps {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  datasetName: string;
  onFileUpload: (data: Record<string, any>[], filename: string) => void;
  onLoadSample: () => void;
  onNext: () => void;
}

export const Step1LoadOverview: React.FC<Step1LoadOverviewProps> = ({
  rows,
  columns,
  datasetName,
  onFileUpload,
  onLoadSample,
  onNext
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please upload a valid .csv file.');
      return;
    }
    setErrorMsg(null);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          onFileUpload(results.data as Record<string, any>[], file.name);
        } else {
          setErrorMsg('Uploaded CSV file appears to be empty.');
        }
      },
      error: (error) => {
        setErrorMsg(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Metrics
  const totalCells = rows.length * columns.length;
  const missingCells = columns.reduce((acc, col) => acc + col.missingCount, 0);
  const missingPercent = totalCells > 0 ? ((missingCells / totalCells) * 100).toFixed(1) : '0';
  const numericCount = columns.filter((c) => c.type === 'numeric').length;
  const categoricalCount = columns.filter((c) => c.type === 'categorical' || c.type === 'boolean').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Upload Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag & Drop your CSV dataset here
            </p>
            <p className="text-xs text-slate-600 mt-1">or click to browse local files from your device</p>
          </div>

          {/* Sample Dataset Card */}
          <div className="lg:w-80 bg-linear-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Ready-to-use Sample</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Employee Attrition Dataset</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pre-configured with realistic HR features, missing salaries, whitespace inconsistencies, and negative age values to demonstrate the full pipeline.
              </p>
            </div>
            <button
              onClick={onLoadSample}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors shadow-2xs flex items-center justify-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Load Employee Attrition</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Dataset Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-600">Total Rows</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{rows.length}</div>
          <span className="text-[11px] text-slate-600">Sample instances</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-600">Total Columns</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{columns.length}</div>
          <span className="text-[11px] text-slate-600">Features + identifiers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-600">Numeric Features</span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">{numericCount}</div>
          <span className="text-[11px] text-slate-600">Integers & floats</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-600">Categorical Features</span>
          <div className="text-2xl font-bold font-mono text-purple-600 mt-1">{categoricalCount}</div>
          <span className="text-[11px] text-slate-600">Nominal & ordinal</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 md:col-span-1">
          <span className="text-xs font-medium text-slate-600">Missing Values</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${missingCells > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {missingCells}
          </div>
          <span className="text-[11px] text-slate-600">{missingPercent}% of all cells</span>
        </div>
      </div>

      {/* Schema Overview Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Detected Schema & Data Types</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated data type inference, unique cardinality, and missing count breakdown per column
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {columns.length} columns inspected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Column Name</th>
                <th className="py-2.5 px-4 font-semibold">Inferred Type</th>
                <th className="py-2.5 px-4 font-semibold">Unique Values</th>
                <th className="py-2.5 px-4 font-semibold">Missing Count</th>
                <th className="py-2.5 px-4 font-semibold">Sample Distinct Values</th>
                <th className="py-2.5 px-4 font-semibold">Status / Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {columns.map((col) => {
                const missingRate = ((col.missingCount / rows.length) * 100).toFixed(1);
                return (
                  <tr key={col.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{col.name}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium font-sans ${
                          col.type === 'numeric'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : col.type === 'id'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {col.type === 'numeric' ? <Hash className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                        <span className="capitalize">{col.type}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{col.uniqueCount} distinct</td>
                    <td className="py-2.5 px-4">
                      {col.missingCount > 0 ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {col.missingCount} ({missingRate}%)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-sans text-[11px] font-medium">0 (0%)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {col.sampleValues.map((v) => (v === null ? 'null' : String(v))).join(', ')}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {col.isRecommendedDrop ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                          Candidate to drop (ID/constant)
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[11px] flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Valid Feature</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data Preview Table (First 10 rows preview as requested in brief) */}
      <DataTable
        rows={rows}
        columns={columns}
        title="Raw Dataset Preview"
        subtitle="Displaying raw data table with detected column types. Note any nulls, inconsistent casing, and negative anomalies."
        defaultPageSize={10}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Loaded <span className="font-semibold text-slate-800">{datasetName}</span> ({rows.length} rows, {columns.length} columns)
        </div>
        <button
          onClick={onNext}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <span>Proceed to Exploratory Data Analysis (EDA)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
