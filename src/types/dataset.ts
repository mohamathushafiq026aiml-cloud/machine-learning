export type DataType = 'numeric' | 'categorical' | 'boolean' | 'id';

export interface ColumnInfo {
  name: string;
  type: DataType;
  uniqueCount: number;
  missingCount: number;
  sampleValues: (string | number | null)[];
  isRecommendedDrop?: boolean;
  dropReason?: string;
}

export interface NumericStats {
  column: string;
  count: number;
  missing: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q25?: number;
  q75?: number;
}

export interface CategoricalStats {
  column: string;
  frequencies: { value: string; count: number; percentage: number }[];
  mode: string;
  uniqueCount: number;
}

export interface InvalidRule {
  column: string;
  type: 'non-negative' | 'positive' | 'range';
  min?: number;
  max?: number;
  flaggedCount: number;
  sampleInvalidValues: (string | number)[];
}

export interface OrdinalMapping {
  column: string;
  order: string[]; // Order from lowest (0) to highest (N-1)
  mapping: Record<string, number>;
}

export interface OneHotConfig {
  column: string;
  categories: string[];
  dummyColumns: string[];
}

export interface NormalizationSummary {
  column: string;
  originalMin: number;
  originalMax: number;
  originalMean: number;
  originalMedian: number;
  scaledMin: number;
  scaledMax: number;
  scaledMean: number;
  scaledMedian: number;
}

export interface CorrelationResult {
  feature: string;
  correlation: number;
  absCorrelation: number;
  direction: 'positive' | 'negative' | 'none';
  strength: 'strong' | 'moderate' | 'weak';
}

export interface PipelineLogEntry {
  id: string;
  timestamp: string;
  stepNumber: number;
  stepName: string;
  action: string;
  details: string;
  rationale: string;
  metricsBefore?: Record<string, string | number>;
  metricsAfter?: Record<string, string | number>;
}

export type StepId = 
  | 'load'
  | 'eda'
  | 'clean'
  | 'impute'
  | 'encode'
  | 'normalize'
  | 'correlation'
  | 'export';

export interface StepDefinition {
  id: StepId;
  number: number;
  name: string;
  shortDesc: string;
}

export interface PipelineState {
  currentStep: StepId;
  rawDatasetName: string;
  targetColumn: string;
  // History of datasets at each stage
  rawRows: Record<string, any>[];
  cleanedRows: Record<string, any>[];
  imputedRows: Record<string, any>[];
  encodedRows: Record<string, any>[];
  normalizedRows: Record<string, any>[];
  finalRows: Record<string, any>[];
  
  // Pipeline applied states
  isCleaned: boolean;
  isImputed: boolean;
  isEncoded: boolean;
  isNormalized: boolean;
  isFeatureSelected: boolean;

  // Selected features for export
  selectedFeatures: string[];

  // Configurations
  textStandardizationApplied: boolean;
  invalidRules: InvalidRule[];
  droppedColumns: string[];
  ordinalMappings: OrdinalMapping[];
  oneHotColumns: string[];
  normalizedColumns: string[];
  
  // Logs
  logs: PipelineLogEntry[];
}
