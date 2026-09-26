import {
  ColumnInfo,
  NumericStats,
  CategoricalStats,
  InvalidRule,
  OrdinalMapping,
  NormalizationSummary,
  CorrelationResult,
  PipelineLogEntry
} from '../types/dataset';

// Helper to check if a value is effectively null/empty
export function isMissing(val: any): boolean {
  return val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val));
}

// Infer column types and basic metadata
export function inferColumnTypes(rows: Record<string, any>[]): ColumnInfo[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);

  return keys.map((key) => {
    let numericCount = 0;
    let missingCount = 0;
    const uniqueValues = new Set<string>();
    const samples: any[] = [];

    for (const row of rows) {
      const val = row[key];
      if (isMissing(val)) {
        missingCount++;
      } else {
        const strVal = String(val).trim();
        uniqueValues.add(strVal);
        if (samples.length < 5 && !samples.includes(val)) {
          samples.push(val);
        }

        const num = Number(val);
        if (!isNaN(num) && typeof val !== 'boolean') {
          numericCount++;
        }
      }
    }

    const nonMissingCount = rows.length - missingCount;
    const isMostlyNumeric = nonMissingCount > 0 && (numericCount / nonMissingCount) >= 0.85;

    // Check if column is an ID or identifier
    const lowerKey = key.toLowerCase();
    const isIdName = lowerKey.endsWith('id') || lowerKey.startsWith('id_') || lowerKey === 'id' || lowerKey.includes('identifier');
    const isAllUnique = nonMissingCount > 0 && uniqueValues.size === nonMissingCount;
    const isSingleValue = uniqueValues.size <= 1;

    let type: ColumnInfo['type'] = 'categorical';
    let isRecommendedDrop = false;
    let dropReason = '';

    if (isIdName && (isAllUnique || uniqueValues.size > rows.length * 0.8)) {
      type = 'id';
      isRecommendedDrop = true;
      dropReason = 'High cardinality unique identifier (likely ID column) — causes data leakage or overfitting.';
    } else if (isSingleValue && nonMissingCount > 1) {
      type = isMostlyNumeric ? 'numeric' : 'categorical';
      isRecommendedDrop = true;
      dropReason = 'Zero variance (single constant value across all rows) — provides zero predictive signal.';
    } else if (isMostlyNumeric) {
      type = 'numeric';
    } else if (uniqueValues.size === 2) {
      type = 'boolean';
    }

    return {
      name: key,
      type,
      uniqueCount: uniqueValues.size,
      missingCount,
      sampleValues: samples,
      isRecommendedDrop,
      dropReason
    };
  });
}

// Compute statistics for numeric column
export function getNumericStats(rows: Record<string, any>[], column: string): NumericStats {
  const values: number[] = [];
  let missing = 0;

  for (const r of rows) {
    const val = r[column];
    if (isMissing(val)) {
      missing++;
    } else {
      const num = Number(val);
      if (!isNaN(num)) {
        values.push(num);
      } else {
        missing++;
      }
    }
  }

  if (values.length === 0) {
    return {
      column,
      count: 0,
      missing,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0
    };
  }

  values.sort((a, b) => a - b);
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const mean = sum / values.length;

  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

  const min = values[0];
  const max = values[values.length - 1];

  const variance = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const q25Index = Math.floor(values.length * 0.25);
  const q75Index = Math.floor(values.length * 0.75);

  return {
    column,
    count: values.length,
    missing,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q25: Number(values[q25Index].toFixed(2)),
    q75: Number(values[q75Index].toFixed(2))
  };
}

// Compute statistics for categorical column
export function getCategoricalStats(rows: Record<string, any>[], column: string): CategoricalStats {
  const counts: Record<string, number> = {};
  let totalNonMissing = 0;

  for (const r of rows) {
    const val = r[column];
    if (!isMissing(val)) {
      const str = String(val).trim();
      counts[str] = (counts[str] || 0) + 1;
      totalNonMissing++;
    }
  }

  const frequencies = Object.entries(counts)
    .map(([value, count]) => ({
      value,
      count,
      percentage: totalNonMissing > 0 ? Number(((count / totalNonMissing) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const mode = frequencies.length > 0 ? frequencies[0].value : 'N/A';

  return {
    column,
    frequencies,
    mode,
    uniqueCount: frequencies.length
  };
}

// Detect invalid rules (negative values in columns that should only be positive, like age, income, experience, count)
export function detectInvalidRules(rows: Record<string, any>[], columns: ColumnInfo[]): InvalidRule[] {
  const rules: InvalidRule[] = [];

  for (const col of columns) {
    if (col.type !== 'numeric') continue;

    const lower = col.name.toLowerCase();
    const shouldBePositive = 
      lower.includes('age') || 
      lower.includes('income') || 
      lower.includes('salary') || 
      lower.includes('year') || 
      lower.includes('rate') || 
      lower.includes('count') || 
      lower.includes('tenure') ||
      lower.includes('experience') ||
      lower.includes('price');

    let negativeCount = 0;
    const sampleInvalid: (string | number)[] = [];

    for (const r of rows) {
      const val = r[col.name];
      if (!isMissing(val)) {
        const num = Number(val);
        if (!isNaN(num) && num < 0) {
          negativeCount++;
          if (sampleInvalid.length < 5) {
            sampleInvalid.push(num);
          }
        }
      }
    }

    // Flag if should be positive and has negative, or any numeric column where negative values are rare anomaly (<10%)
    if (negativeCount > 0 && (shouldBePositive || negativeCount < rows.length * 0.1)) {
      rules.push({
        column: col.name,
        type: 'non-negative',
        min: 0,
        flaggedCount: negativeCount,
        sampleInvalidValues: sampleInvalid
      });
    }
  }

  return rules;
}

// Clean text casing and whitespace
export function cleanTextCategoricals(
  rows: Record<string, any>[],
  columns: string[]
): { cleaned: Record<string, any>[]; affectedCount: number; sampleCorrections: { col: string; before: string; after: string }[] } {
  let affectedCount = 0;
  const sampleCorrections: { col: string; before: string; after: string }[] = [];

  const cleaned = rows.map((row) => {
    const newRow = { ...row };
    for (const col of columns) {
      const val = newRow[col];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Convert to canonical casing (Title Case words)
        const standardized = trimmed
          .split(/\s+/)
          .map((w) => {
            // Keep acronyms like HR, R&D, IT as is, or title-case words
            if (w.toUpperCase() === 'HR' || w.toUpperCase() === 'R&D' || w.toUpperCase() === 'IT') {
              return w.toUpperCase();
            }
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          })
          .join(' ');

        if (standardized !== val) {
          affectedCount++;
          if (sampleCorrections.length < 6 && !sampleCorrections.some(c => c.before === val && c.after === standardized)) {
            sampleCorrections.push({ col, before: val, after: standardized });
          }
          newRow[col] = standardized;
        }
      }
    }
    return newRow;
  });

  return { cleaned, affectedCount, sampleCorrections };
}

// Convert detected invalid values to missing (null)
export function convertInvalidsToMissing(
  rows: Record<string, any>[],
  rules: InvalidRule[]
): { cleaned: Record<string, any>[]; convertedCount: number; details: string[] } {
  let convertedCount = 0;
  const details: string[] = [];

  const ruleMap = new Map<string, InvalidRule>();
  rules.forEach(r => ruleMap.set(r.column, r));

  const cleaned = rows.map((row) => {
    const newRow = { ...row };
    for (const [colName, rule] of ruleMap.entries()) {
      const val = newRow[colName];
      if (!isMissing(val)) {
        const num = Number(val);
        if (!isNaN(num) && rule.min !== undefined && num < rule.min) {
          newRow[colName] = null;
          convertedCount++;
          if (details.length < 5) {
            details.push(`${colName}: converted invalid value ${num} to missing (null)`);
          }
        }
      }
    }
    return newRow;
  });

  return { cleaned, convertedCount, details };
}

// Drop columns
export function dropColumns(rows: Record<string, any>[], colsToDrop: string[]): Record<string, any>[] {
  if (colsToDrop.length === 0) return rows;
  const dropSet = new Set(colsToDrop);

  return rows.map((row) => {
    const newRow: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      if (!dropSet.has(key)) {
        newRow[key] = row[key];
      }
    }
    return newRow;
  });
}

// Impute missing values: numeric with median, categorical with mode
export function imputeMissingValues(
  rows: Record<string, any>[],
  columns: ColumnInfo[]
): {
  imputed: Record<string, any>[];
  imputationMap: Record<string, { type: 'median' | 'mode'; value: any; filledCount: number }>;
} {
  const imputationMap: Record<string, { type: 'median' | 'mode'; value: any; filledCount: number }> = {};

  // Precompute medians and modes
  for (const col of columns) {
    if (col.missingCount === 0) continue;

    if (col.type === 'numeric') {
      const stats = getNumericStats(rows, col.name);
      imputationMap[col.name] = {
        type: 'median',
        value: stats.median,
        filledCount: 0
      };
    } else {
      const stats = getCategoricalStats(rows, col.name);
      imputationMap[col.name] = {
        type: 'mode',
        value: stats.mode,
        filledCount: 0
      };
    }
  }

  const imputed = rows.map((row) => {
    const newRow = { ...row };
    for (const colName of Object.keys(imputationMap)) {
      if (isMissing(newRow[colName])) {
        newRow[colName] = imputationMap[colName].value;
        imputationMap[colName].filledCount++;
      }
    }
    return newRow;
  });

  return { imputed, imputationMap };
}

// Encode categorical variables
export function encodeCategoricals(
  rows: Record<string, any>[],
  nominalCols: string[],
  ordinalMappings: OrdinalMapping[],
  targetCol?: string
): {
  encoded: Record<string, any>[];
  dummyColumnsMap: Record<string, string[]>;
  labelMappings: Record<string, Record<string, number>>;
  targetMapping?: Record<string, number>;
} {
  const dummyColumnsMap: Record<string, string[]> = {};
  const labelMappings: Record<string, Record<string, number>> = {};
  let targetMapping: Record<string, number> | undefined;

  // Build ordinal mappings
  for (const ord of ordinalMappings) {
    labelMappings[ord.column] = ord.mapping;
  }

  // Pre-find unique categories for nominal columns
  for (const col of nominalCols) {
    const cats = new Set<string>();
    for (const r of rows) {
      if (!isMissing(r[col])) {
        cats.add(String(r[col]).trim());
      }
    }
    const catList = Array.from(cats).sort();
    dummyColumnsMap[col] = catList.map(c => `${col}_${c.replace(/[^a-zA-Z0-9]/g, '_')}`);
  }

  // Handle binary target encoding if target column is categorical with 2 classes
  if (targetCol) {
    const targetCats = new Set<string>();
    for (const r of rows) {
      if (!isMissing(r[targetCol])) {
        targetCats.add(String(r[targetCol]).trim());
      }
    }
    if (targetCats.size === 2) {
      const arr = Array.from(targetCats);
      // Give 1 to 'yes', 'true', 'positive', 'churn', 'attrition' etc.
      let posIndex = arr.findIndex(v => ['yes', 'true', '1', 'positive', 'churn', 'leave', 'high'].includes(v.toLowerCase()));
      if (posIndex === -1) posIndex = 1;
      const negIndex = posIndex === 0 ? 1 : 0;

      targetMapping = {
        [arr[negIndex]]: 0,
        [arr[posIndex]]: 1
      };
      labelMappings[targetCol] = targetMapping;
    }
  }

  const encoded = rows.map((row) => {
    const newRow = { ...row };

    // 1. Ordinal encoding
    for (const ord of ordinalMappings) {
      const val = String(newRow[ord.column]).trim();
      if (ord.mapping[val] !== undefined) {
        newRow[ord.column] = ord.mapping[val];
      }
    }

    // 2. Target binary encoding (if applicable and not already in ordinal)
    if (targetCol && targetMapping && !ordinalMappings.some(o => o.column === targetCol)) {
      const val = String(newRow[targetCol]).trim();
      if (targetMapping[val] !== undefined) {
        newRow[targetCol] = targetMapping[val];
      }
    }

    // 3. One-hot encoding for nominal columns
    for (const nomCol of nominalCols) {
      const val = String(newRow[nomCol]).trim();
      const safeNomCol = nomCol;

      const dummyNames = dummyColumnsMap[nomCol] || [];
      for (const dummyName of dummyNames) {
        // e.g. Department_Sales
        const expectedVal = dummyName.substring(safeNomCol.length + 1);
        const currentCleanVal = val.replace(/[^a-zA-Z0-9]/g, '_');
        newRow[dummyName] = currentCleanVal === expectedVal ? 1 : 0;
      }
      // Remove original nominal column
      delete newRow[nomCol];
    }

    return newRow;
  });

  return { encoded, dummyColumnsMap, labelMappings, targetMapping };
}

// Min-Max Scaling: x' = (x - min) / (max - min)
export function minMaxScale(
  rows: Record<string, any>[],
  numericCols: string[]
): {
  normalized: Record<string, any>[];
  summaries: NormalizationSummary[];
} {
  const summaries: NormalizationSummary[] = [];
  const minMaxMap: Record<string, { min: number; max: number; origMean: number; origMedian: number }> = {};

  for (const col of numericCols) {
    const stats = getNumericStats(rows, col);
    minMaxMap[col] = {
      min: stats.min,
      max: stats.max,
      origMean: stats.mean,
      origMedian: stats.median
    };
  }

  const normalized = rows.map((row) => {
    const newRow = { ...row };
    for (const col of numericCols) {
      const val = newRow[col];
      if (!isMissing(val)) {
        const num = Number(val);
        const { min, max } = minMaxMap[col];
        if (max === min) {
          newRow[col] = 0.5;
        } else {
          const scaled = (num - min) / (max - min);
          newRow[col] = Number(scaled.toFixed(4));
        }
      }
    }
    return newRow;
  });

  // Calculate summaries after normalization
  for (const col of numericCols) {
    const statsScaled = getNumericStats(normalized, col);
    const orig = minMaxMap[col];
    summaries.push({
      column: col,
      originalMin: orig.min,
      originalMax: orig.max,
      originalMean: orig.origMean,
      originalMedian: orig.origMedian,
      scaledMin: statsScaled.min,
      scaledMax: statsScaled.max,
      scaledMean: statsScaled.mean,
      scaledMedian: statsScaled.median
    });
  }

  return { normalized, summaries };
}

// Calculate Pearson Correlation
export function calculatePearson(xArr: number[], yArr: number[]): number {
  const n = xArr.length;
  if (n < 2) return 0;

  const meanX = xArr.reduce((a, b) => a + b, 0) / n;
  const meanY = yArr.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - meanX;
    const dy = yArr[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return 0;
  const r = numerator / Math.sqrt(denomX * denomY);
  return Number(r.toFixed(3));
}

// Calculate correlation of all numeric features with target
export function calculateCorrelationsWithTarget(
  rows: Record<string, any>[],
  targetCol: string
): CorrelationResult[] {
  if (!rows || rows.length === 0 || !targetCol) return [];

  // Extract target numeric vector
  const targetVals: number[] = [];
  const validRowIndices: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][targetCol];
    const num = Number(val);
    if (!isNaN(num) && !isMissing(val)) {
      targetVals.push(num);
      validRowIndices.push(i);
    }
  }

  if (targetVals.length < 3) return [];

  const results: CorrelationResult[] = [];
  const keys = Object.keys(rows[0]).filter(k => k !== targetCol);

  for (const key of keys) {
    const featureVals: number[] = [];
    const pairedTargetVals: number[] = [];

    for (const idx of validRowIndices) {
      const val = rows[idx][key];
      const num = Number(val);
      if (!isNaN(num) && !isMissing(val)) {
        featureVals.push(num);
        pairedTargetVals.push(rows[idx][targetCol]);
      }
    }

    if (featureVals.length === validRowIndices.length && featureVals.length >= 3) {
      const r = calculatePearson(featureVals, pairedTargetVals);
      const absR = Math.abs(r);

      results.push({
        feature: key,
        correlation: r,
        absCorrelation: absR,
        direction: r > 0.05 ? 'positive' : r < -0.05 ? 'negative' : 'none',
        strength: absR >= 0.4 ? 'strong' : absR >= 0.2 ? 'moderate' : 'weak'
      });
    }
  }

  return results.sort((a, b) => b.absCorrelation - a.absCorrelation);
}

// Calculate pairwise correlation matrix among selected features
export function calculateCorrelationMatrix(
  rows: Record<string, any>[],
  features: string[]
): { features: string[]; matrix: number[][] } {
  const matrix: number[][] = [];

  for (let i = 0; i < features.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < features.length; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        const x: number[] = [];
        const y: number[] = [];
        for (const row of rows) {
          const valX = Number(row[features[i]]);
          const valY = Number(row[features[j]]);
          if (!isNaN(valX) && !isNaN(valY)) {
            x.push(valX);
            y.push(valY);
          }
        }
        matrix[i][j] = calculatePearson(x, y);
      }
    }
  }

  return { features, matrix };
}

// Markdown Documentation Report Generator
export function generateMarkdownReport(
  logs: PipelineLogEntry[],
  datasetName: string,
  rawCount: { rows: number; cols: number },
  finalCount: { rows: number; cols: number },
  targetColumn: string
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `# Data Preprocessing & ML Preparation Report
**Dataset:** ${datasetName}  
**Date Generated:** ${dateStr}  
**Target Feature:** \`${targetColumn || 'Not specified'}\`  
**Pipeline Transformation:** Raw (${rawCount.rows} rows, ${rawCount.cols} cols) ➔ Final Cleaned (${finalCount.rows} rows, ${finalCount.cols} cols)

---

## Executive Summary
This report documents the end-to-end data preprocessing pipeline performed using **Data Preprocessing Studio**. Clean and properly prepared datasets are the cornerstone of accurate Machine Learning models, preventing algorithmic bias, multicollinearity, information leakage, and numerical instability during model training (e.g. gradient descent divergence in SVMs, Neural Networks, and Logistic Regression).

---

## Preprocessing Pipeline Audit Log

${logs
  .map(
    (log, index) => `### Step ${log.stepNumber}: ${log.stepName}
- **Action Performed:** ${log.action}
- **Timestamp:** \`${log.timestamp}\`
- **Execution Details:**
  ${log.details.split('\n').join('\n  ')}
- **Machine Learning Rationale:**
  > *${log.rationale}*
`
  )
  .join('\n---\n\n')}

---

## Modeling Recommendations
1. **Model Evaluation:** Ensure cross-validation (e.g. 5-Fold Stratified K-Fold) is evaluated on the final features.
2. **Feature Scaling Consistency:** When predicting on new inference batches, use the exact min/max scaling parameters stored from this training pipeline.
3. **Class Balance:** Check target distribution before choosing loss function (weighted cross-entropy / focal loss for imbalanced classes).

*Generated automatically by Data Preprocessing Studio.*
`;
}

// Python Pipeline Reproduction Script Generator
export function generatePythonScript(
  datasetName: string,
  droppedCols: string[],
  nominalCols: string[],
  ordinalMappings: OrdinalMapping[],
  scaledCols: string[],
  targetCol: string
): string {
  return `"""
Data Preprocessing Pipeline Script
Dataset: ${datasetName}
Generated by Data Preprocessing Studio
Ready to run in Google Colab, Jupyter Notebook, or Python script.
"""

import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import MinMaxScaler

# 1. Load Dataset
df = pd.read_csv('dataset.csv')
print(f"Initial shape: {df.shape}")

# 2. Text Standardization (Strip Whitespace & Title Case)
categorical_cols = df.select_dtypes(include=['object']).columns
for col in categorical_cols:
    df[col] = df[col].astype(str).str.strip().str.title()

# 3. Handle Invalid Values (Replace negative values in non-negative features with NaN)
numeric_cols = df.select_dtypes(include=[np.number]).columns
for col in numeric_cols:
    if any(keyword in col.lower() for keyword in ['age', 'income', 'salary', 'year', 'count', 'rate']):
        df[col] = df[col].apply(lambda x: np.nan if x < 0 else x)

# 4. Drop Irrelevant Columns (ID / Constant features)
cols_to_drop = ${JSON.stringify(droppedCols)}
df.drop(columns=[col for col in cols_to_drop if col in df.columns], inplace=True)
print(f"Shape after dropping columns: {df.shape}")

# 5. Missing Value Imputation (Median for Numeric, Mode for Categorical)
numeric_features = df.select_dtypes(include=[np.number]).columns
if len(numeric_features) > 0:
    num_imputer = SimpleImputer(strategy='median')
    df[numeric_features] = num_imputer.fit_transform(df[numeric_features])

cat_features = df.select_dtypes(include=['object']).columns
if len(cat_features) > 0:
    cat_imputer = SimpleImputer(strategy='most_frequent')
    df[cat_features] = cat_imputer.fit_transform(df[cat_features])

# 6. Categorical Encoding
# A. Ordinal Encoding
ordinal_mappings = ${JSON.stringify(
    ordinalMappings.reduce((acc, curr) => {
      acc[curr.column] = curr.mapping;
      return acc;
    }, {} as Record<string, any>),
    null,
    2
  )}

for col, mapping in ordinal_mappings.items():
    if col in df.columns:
        df[col] = df[col].map(mapping)

# B. Target Binary Encoding
target_col = "${targetCol}"
if target_col in df.columns and df[target_col].nunique() == 2:
    target_vals = sorted(df[target_col].unique())
    df[target_col] = df[target_col].map({target_vals[0]: 0, target_vals[1]: 1})

# C. One-Hot Encoding for Nominal Columns
nominal_cols = ${JSON.stringify(nominalCols)}
df = pd.get_dummies(df, columns=[c for c in nominal_cols if c in df.columns], drop_first=False, dtype=int)

# 7. Min-Max Normalization
features_to_scale = ${JSON.stringify(scaledCols)}
valid_scale_cols = [c for c in features_to_scale if c in df.columns]
if len(valid_scale_cols) > 0:
    scaler = MinMaxScaler()
    df[valid_scale_cols] = scaler.fit_transform(df[valid_scale_cols])

print(f"Final preprocessed dataset shape: {df.shape}")
df.to_csv('cleaned_preprocessed_dataset.csv', index=False)
print("Saved final cleaned dataset to 'cleaned_preprocessed_dataset.csv'")
`;
}
