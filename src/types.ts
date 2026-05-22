export interface IDData {
  idNumber: string;
  names: string;
  surnames: string;
  dateOfBirth: string;
  maritalStatus: string;
  issueDate: string;
  expiryDate: string;
}

export interface VitalSigns {
  bpm: number;
  hrv: number;
  rr: number;
  stress: string;
  chartData: { time: number; value: number }[];
}

export interface TriageResult {
  triageLevel: string;
  destination: string;
  waitTime: string;
  clinicalSummary: string;
}

export interface RPPGResult {
  vitals: VitalSigns;
  photoUrl: string;
  symptoms: string;
}
