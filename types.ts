export interface ScannedItem {
  id: string;
  content: string;
  format: string;
  timestamp: number;
  schoolName: string;
  grade: string;
  className: string;
  inputterName: string;
}

export enum ScannerStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  summary: string;
  category: string;
}