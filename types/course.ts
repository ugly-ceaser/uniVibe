export interface CourseNameReference {
  id?: string;
  name: string;
}

export interface CourseLevelReference {
  id?: string;
  level: number;
}

export interface CourseAssessment {
  type: string;
  percentage: number;
}

/** The normalized course shape used by every screen and API consumer. */
export interface Course {
  id: string;
  courseCode: string;
  title: string;
  creditUnit: number;
  courseType?: string;
  description?: string;
  instructor?: string;
  instructorEmail?: string;
  instructorPhone?: string;
  outline?: string[];
  assessment?: CourseAssessment[];
  semester?: string | number | CourseNameReference;
  level?: number | CourseLevelReference;
  programme?: string | CourseNameReference;
  isEnrolled?: boolean;
}

export interface CourseMaterial {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  aiSummarized?: boolean;
}

export interface CourseMaterialUpload {
  uri: string;
  name: string;
  mimeType: string;
  webFile?: Blob;
}
