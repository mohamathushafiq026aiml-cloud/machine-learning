/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { SAMPLE_EMPLOYEE_ATTRITION } from './data/sampleDataset';
import { StepId, PipelineLogEntry, OrdinalMapping, NormalizationSummary } from './types/dataset';
import { inferColumnTypes } from './utils/dataProcessing';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Step1LoadOverview } from './components/steps/Step1LoadOverview';
import { Step2EDA } from './components/steps/Step2EDA';
import { Step3CleanData } from './components/steps/Step3CleanData';
import { Step4MissingValues } from './components/steps/Step4MissingValues';
import { Step5CategoricalEncoding } from './components/steps/Step5CategoricalEncoding';
import { Step6Normalization } from './components/steps/Step6Normalization';
import { Step7Correlation } from './components/steps/Step7Correlation';
import { Step8Export } from './components/steps/Step8Export';

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepId>('load');
  const [datasetName, setDatasetName] = useState<string>('Employee_Attrition_Sample.csv');

  // Stages data state
  const [rawRows, setRawRows] = useState<Record<string, any>[]>(() => SAMPLE_EMPLOYEE_ATTRITION);
  const [cleanedRows, setCleanedRows] = useState<Record<string, any>[] | null>(null);
  const [imputedRows, setImputedRows] = useState<Record<string, any>[] | null>(null);
  const [encodedRows, setEncodedRows] = useState<Record<string, any>[] | null>(null);
  const [normalizedRows, setNormalizedRows] = useState<Record<string, any>[] | null>(null);

  // Target variable
  const [targetColumn, setTargetColumn] = useState<string>('Attrition');

  // Completed status flags
  const [isCleaned, setIsCleaned] = useState<boolean>(false);
  const [isImputed, setIsImputed] = useState<boolean>(false);
  const [isEncoded, setIsEncoded] = useState<boolean>(false);
  const [isNormalized, setIsNormalized] = useState<boolean>(false);

  // Configuration tracking
  const [droppedColumns, setDroppedColumns] = useState<string[]>([]);
  const [nominalColumns, setNominalColumns] = useState<string[]>([]);
  const [ordinalMappings, setOrdinalMappings] = useState<OrdinalMapping[]>([]);
  const [scaledColumns, setScaledColumns] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Pipeline audit logs
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);

  // Compute active dataset for current step
  const activeRows = useMemo(() => {
    if (isNormalized && normalizedRows) return normalizedRows;
    if (isEncoded && encodedRows) return encodedRows;
    if (isImputed && imputedRows) return imputedRows;
    if (isCleaned && cleanedRows) return cleanedRows;
    return rawRows;
  }, [isNormalized, normalizedRows, isEncoded, encodedRows, isImputed, imputedRows, isCleaned, cleanedRows, rawRows]);

  // Schema for current active rows
  const activeColumns = useMemo(() => {
    return inferColumnTypes(activeRows);
  }, [activeRows]);

  // Schema for raw data
  const rawColumns = useMemo(() => {
    return inferColumnTypes(rawRows);
  }, [rawRows]);

  // Initial log entry on dataset mount
  useEffect(() => {
    const time = new Date().toLocaleTimeString();
    setLogs([
      {
        id: 'log-1',
        stepNumber: 1,
        stepName: 'Load & Schema Identification',
        timestamp: time,
        action: `Loaded dataset "${datasetName}" with ${rawRows.length} rows and ${rawColumns.length} columns.`,
        details: `Identified ${rawColumns.filter((c) => c.type === 'numeric').length} numeric columns, ${
          rawColumns.filter((c) => c.type === 'categorical' || c.type === 'boolean').length
        } categorical columns. Missing cells: ${rawColumns.reduce((a, b) => a + b.missingCount, 0)}.`,
        rationale:
          'Input validation ensures column data types are identified before mathematical transformations. High cardinality ID columns (e.g. EmployeeID) are cataloged for elimination.'
      }
    ]);

    // Auto set target if 'Attrition' or other binary candidate exists
    const targetCandidate = rawColumns.find(
      (c) => c.name.toLowerCase() === 'attrition' || c.name.toLowerCase() === 'target' || c.name.toLowerCase() === 'label'
    );
    if (targetCandidate) {
      setTargetColumn(targetCandidate.name);
    } else if (rawColumns.length > 0) {
      setTargetColumn(rawColumns[rawColumns.length - 1].name);
    }
  }, [rawRows.length, rawColumns.length]);

  // Reset all steps to raw
  const handleResetAll = () => {
    setCleanedRows(null);
    setImputedRows(null);
    setEncodedRows(null);
    setNormalizedRows(null);
    setIsCleaned(false);
    setIsImputed(false);
    setIsEncoded(false);
    setIsNormalized(false);
    setDroppedColumns([]);
    setNominalColumns([]);
    setOrdinalMappings([]);
    setScaledColumns([]);
    setSelectedFeatures([]);
    setCurrentStep('load');

    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: `log-reset-${Date.now()}`,
        stepNumber: 1,
        stepName: 'Pipeline Reset',
        timestamp: time,
        action: 'Reset all preprocessing stages to original raw data.',
        details: 'Cleared all downstream cleanings, imputations, encodings, and scaling transformations.',
        rationale: 'Allows re-testing different pipeline parameters and configurations from a clean slate.'
      }
    ]);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    setDatasetName('Employee_Attrition_Sample.csv');
    setRawRows(SAMPLE_EMPLOYEE_ATTRITION);
    handleResetAll();
  };

  // Upload user file
  const handleFileUpload = (data: Record<string, any>[], filename: string) => {
    setDatasetName(filename);
    setRawRows(data);
    handleResetAll();
  };

  // 1. Apply Step 3: Cleaning
  const handleApplyCleaning = (
    newCleaned: Record<string, any>[],
    droppedCols: string[],
    textCleanedCount: number,
    invalidsConvertedCount: number,
    corrections: { col: string; before: string; after: string }[]
  ) => {
    setCleanedRows(newCleaned);
    setIsCleaned(true);
    setDroppedColumns(droppedCols);

    // Invalidate subsequent dependent steps if re-applied
    setIsImputed(false);
    setIsEncoded(false);
    setIsNormalized(false);
    setImputedRows(null);
    setEncodedRows(null);
    setNormalizedRows(null);

    const time = new Date().toLocaleTimeString();
    const correctionsText =
      corrections.length > 0
        ? `Standardized text values: ${corrections.map((c) => `"${c.before}" ➔ "${c.after}"`).join(', ')}.`
        : 'Text was already canonical.';

    setLogs((prev) => [
      ...prev,
      {
        id: `log-clean-${Date.now()}`,
        stepNumber: 3,
        stepName: 'Data Cleaning & Hygiene',
        timestamp: time,
        action: `Cleaned ${textCleanedCount} text entries, converted ${invalidsConvertedCount} domain-invalid numbers to missing, dropped ${droppedCols.length} columns.`,
        details: `${correctionsText}\nDropped columns: ${droppedCols.join(', ') || 'None'}.\nInvalid negative values replaced with null (NaN) for systematic statistical imputation.`,
        rationale:
          'Inconsistent text casing creates spurious duplicate categories during one-hot encoding. Negative values in strictly positive domains (e.g. Age, Income) severely distort linear model weights. Dropping unique ID columns prevents the model from memorizing indices (overfitting).'
      }
    ]);
  };

  // 2. Apply Step 4: Imputation
  const handleApplyImputation = (
    newImputed: Record<string, any>[],
    imputationMap: Record<string, { type: 'median' | 'mode'; value: any; filledCount: number }>
  ) => {
    setImputedRows(newImputed);
    setIsImputed(true);

    // Invalidate downstream
    setIsEncoded(false);
    setIsNormalized(false);
    setEncodedRows(null);
    setNormalizedRows(null);

    const time = new Date().toLocaleTimeString();
    const details = Object.entries(imputationMap)
      .map(([col, info]) => `${col}: filled ${info.filledCount} nulls with ${info.type} = "${info.value}"`)
      .join('\n');

    setLogs((prev) => [
      ...prev,
      {
        id: `log-impute-${Date.now()}`,
        stepNumber: 4,
        stepName: 'Missing Value Imputation',
        timestamp: time,
        action: `Imputed missing cells across ${Object.keys(imputationMap).length} columns. Total missing cells reduced to 0.`,
        details: details || 'All columns already complete.',
        rationale:
          'Scikit-learn algorithms (e.g. LogisticRegression, RandomForest, SVC) throw runtime exceptions on null inputs. Using Median for continuous numeric data preserves the 50th percentile without succumbing to skewness or extreme outliers. Using Mode replaces missing categorical labels with the highest likelihood empirical class.'
      }
    ]);
  };

  // 3. Apply Step 5: Categorical Encoding
  const handleApplyEncoding = (
    newEncoded: Record<string, any>[],
    nomCols: string[],
    ordMappings: OrdinalMapping[],
    dummyColumnsMap: Record<string, string[]>,
    labelMappings: Record<string, Record<string, number>>
  ) => {
    setEncodedRows(newEncoded);
    setIsEncoded(true);
    setNominalColumns(nomCols);
    setOrdinalMappings(ordMappings);

    // Invalidate downstream
    setIsNormalized(false);
    setNormalizedRows(null);

    const time = new Date().toLocaleTimeString();
    const dummySummary = Object.entries(dummyColumnsMap)
      .map(([col, dummies]) => `One-Hot: ${col} ➔ ${dummies.length} dummy columns (${dummies.join(', ')})`)
      .join('\n');
    const ordinalSummary = ordMappings
      .map((ord) => `Ordinal: ${ord.column} ➔ { ${Object.entries(ord.mapping).map(([k, v]) => `"${k}": ${v}`).join(', ')} }`)
      .join('\n');

    setLogs((prev) => [
      ...prev,
      {
        id: `log-encode-${Date.now()}`,
        stepNumber: 5,
        stepName: 'Categorical Encoding',
        timestamp: time,
        action: `Vectorized qualitative features. One-hot encoded ${nomCols.length} nominal features, label-encoded ${ordMappings.length} ordinal features, binary-encoded target "${targetColumn}".`,
        details: `${dummySummary}\n${ordinalSummary}`,
        rationale:
          'One-Hot encoding prevents nominal features (where no hierarchy exists, e.g. Department) from imposing unintended mathematical rankings. Ordinal encoding accurately injects semantic order (e.g. High School < Bachelor < Master < Doctorate) into the feature space.'
      }
    ]);
  };

  // 4. Apply Step 6: Normalization
  const handleApplyNormalization = (
    newNormalized: Record<string, any>[],
    summaries: NormalizationSummary[],
    scaledCols: string[]
  ) => {
    setNormalizedRows(newNormalized);
    setIsNormalized(true);
    setScaledColumns(scaledCols);

    // Set initial selected features for Step 7 / 8 (all non-target columns)
    if (newNormalized.length > 0) {
      const allFeats = Object.keys(newNormalized[0]).filter((k) => k !== targetColumn);
      setSelectedFeatures(allFeats);
    }

    const time = new Date().toLocaleTimeString();
    const scaleDetails = summaries
      .map((s) => `${s.column}: [${s.originalMin}, ${s.originalMax}] ➔ [${s.scaledMin.toFixed(2)}, ${s.scaledMax.toFixed(2)}]`)
      .join('\n');

    setLogs((prev) => [
      ...prev,
      {
        id: `log-scale-${Date.now()}`,
        stepNumber: 6,
        stepName: 'Min-Max Normalization',
        timestamp: time,
        action: `Scaled ${scaledCols.length} continuous numeric features to standard [0.0, 1.0] interval.`,
        details: scaleDetails,
        rationale:
          'Gradient-based optimization (SGD, Adam) and distance-based classifiers (KNN, SVM) diverge or become heavily biased toward features with huge numerical ranges (e.g. Monthly Income ~15,000 vs Age ~40). Min-Max scaling balances gradient updates across all dimensional axes.'
      }
    ]);
  };

  // Feature selection update in Step 7
  const handleUpdateSelectedFeatures = (features: string[]) => {
    setSelectedFeatures(features);
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: `log-select-${Date.now()}`,
        stepNumber: 7,
        stepName: 'Feature Correlation & Selection',
        timestamp: time,
        action: `Filtered active feature set to ${features.length} selected features based on target correlation.`,
        details: `Active predictors: ${features.join(', ')}. Target: ${targetColumn}.`,
        rationale:
          'Pruning weakly correlated and redundant features reduces the curse of dimensionality, mitigates multicollinearity, speeds up training convergence, and lowers test-set variance.'
      }
    ]);
  };

  // Final dataset for export: derived from latest available stage
  const finalDatasetRows = useMemo(() => {
    if (isNormalized && normalizedRows) return normalizedRows;
    if (isEncoded && encodedRows) return encodedRows;
    if (isImputed && imputedRows) return imputedRows;
    if (isCleaned && cleanedRows) return cleanedRows;
    return rawRows;
  }, [isNormalized, normalizedRows, isEncoded, encodedRows, isImputed, imputedRows, isCleaned, cleanedRows, rawRows]);

  // Quick export CSV from header
  const handleQuickExport = () => {
    const keepKeys =
      selectedFeatures.length > 0 ? new Set([...selectedFeatures, targetColumn]) : null;

    const rowsToExport = keepKeys
      ? finalDatasetRows.map((row) => {
          const filtered: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            if (keepKeys.has(key)) filtered[key] = row[key];
          }
          return filtered;
        })
      : finalDatasetRows;

    const csv = Papa.unparse(rowsToExport);
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

  // Total missing cells in active dataset
  const currentMissingCells = useMemo(() => {
    let count = 0;
    for (const row of activeRows) {
      for (const val of Object.values(row)) {
        if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
          count++;
        }
      }
    }
    return count;
  }, [activeRows]);

  // Step transition navigation
  const stepOrder: StepId[] = [
    'load',
    'eda',
    'clean',
    'impute',
    'encode',
    'normalize',
    'correlation',
    'export'
  ];

  const handleNextStep = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx < stepOrder.length - 1) {
      setCurrentStep(stepOrder[idx + 1]);
    }
  };

  const handlePrevStep = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(stepOrder[idx - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Application Bar */}
      <Header
        datasetName={datasetName}
        rowCount={activeRows.length}
        colCount={activeColumns.length}
        currentStep={currentStep}
        onReset={handleResetAll}
        onLoadSample={handleLoadSample}
        onExportQuick={handleQuickExport}
        isPipelineComplete={isNormalized && isEncoded && isImputed && isCleaned}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Pipeline Navigation */}
        <Sidebar
          currentStep={currentStep}
          onSelectStep={(step) => setCurrentStep(step)}
          stepStatus={{
            isCleaned,
            isImputed,
            isEncoded,
            isNormalized
          }}
          metrics={{
            rows: activeRows.length,
            cols: activeColumns.length,
            missingCells: currentMissingCells
          }}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentStep === 'load' && (
            <Step1LoadOverview
              rows={rawRows}
              columns={rawColumns}
              datasetName={datasetName}
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSample}
              onNext={handleNextStep}
            />
          )}

          {currentStep === 'eda' && (
            <Step2EDA
              rows={activeRows}
              columns={activeColumns}
              targetColumn={targetColumn}
              onSetTargetColumn={setTargetColumn}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'clean' && (
            <Step3CleanData
              currentRows={rawRows}
              columns={rawColumns}
              isCleaned={isCleaned}
              onApplyCleaning={handleApplyCleaning}
              onResetCleaning={() => {
                setIsCleaned(false);
                setCleanedRows(null);
              }}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'impute' && (
            <Step4MissingValues
              currentRows={isCleaned && cleanedRows ? cleanedRows : rawRows}
              columns={inferColumnTypes(isCleaned && cleanedRows ? cleanedRows : rawRows)}
              isImputed={isImputed}
              onApplyImputation={handleApplyImputation}
              onResetImputation={() => {
                setIsImputed(false);
                setImputedRows(null);
              }}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'encode' && (
            <Step5CategoricalEncoding
              currentRows={isImputed && imputedRows ? imputedRows : (isCleaned && cleanedRows ? cleanedRows : rawRows)}
              columns={inferColumnTypes(isImputed && imputedRows ? imputedRows : (isCleaned && cleanedRows ? cleanedRows : rawRows))}
              targetColumn={targetColumn}
              isEncoded={isEncoded}
              onApplyEncoding={handleApplyEncoding}
              onResetEncoding={() => {
                setIsEncoded(false);
                setEncodedRows(null);
              }}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'normalize' && (
            <Step6Normalization
              currentRows={isEncoded && encodedRows ? encodedRows : (isImputed && imputedRows ? imputedRows : (isCleaned && cleanedRows ? cleanedRows : rawRows))}
              targetColumn={targetColumn}
              isNormalized={isNormalized}
              onApplyNormalization={handleApplyNormalization}
              onResetNormalization={() => {
                setIsNormalized(false);
                setNormalizedRows(null);
              }}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'correlation' && (
            <Step7Correlation
              currentRows={activeRows}
              targetColumn={targetColumn}
              onSetTargetColumn={setTargetColumn}
              selectedFeatures={
                selectedFeatures.length > 0
                  ? selectedFeatures
                  : Object.keys(activeRows[0] || {}).filter((k) => k !== targetColumn)
              }
              onUpdateSelectedFeatures={handleUpdateSelectedFeatures}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}

          {currentStep === 'export' && (
            <Step8Export
              finalRows={finalDatasetRows}
              datasetName={datasetName}
              targetColumn={targetColumn}
              selectedFeatures={
                selectedFeatures.length > 0
                  ? selectedFeatures
                  : Object.keys(finalDatasetRows[0] || {}).filter((k) => k !== targetColumn)
              }
              logs={logs}
              droppedColumns={droppedColumns}
              nominalColumns={nominalColumns}
              ordinalMappings={ordinalMappings}
              scaledColumns={scaledColumns}
              rawCount={{ rows: rawRows.length, cols: rawColumns.length }}
              onPrev={handlePrevStep}
            />
          )}
        </main>
      </div>
    </div>
  );
}
