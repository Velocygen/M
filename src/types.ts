export interface Subject {
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
}

export interface SiteSettings {
  academyName: string;
  subTitle: string;
  signatureUrl: string;
  logoUrl: string;
  viewCount: number;
  countingEnabled: boolean;
}

export interface ApiKey {
  id: string; // from document id
  key: string; // The actual API key (usually we'd only store a hash, but for this demo storing raw is fine or we show it once)
  name: string;
  limit: number;
  used: number;
  expiresAt: number | null; // null if never expires
  disabled: boolean;
  createdAt: number;
}

export interface ExamResult {
  id: string; // from document id
  studentName: string;
  fatherName: string;
  mothersName: string;
  rollNumber: string;
  class: string;
  examName: string;
  subjects: Subject[];
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  passStatus: boolean;
  published: boolean;
  place?: string;
  createdAt: number;
  updatedAt: number;
}
