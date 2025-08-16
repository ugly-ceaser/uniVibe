export interface Profile {
  fullname: string;
  phone: string | undefined;
  department: string | undefined;
  faculty: string | undefined;
  level: number | undefined;
  semester: string | undefined;
}

export interface ProfileUpdateData {
  fullname?: string | undefined;
  phone?: string | undefined;
  department?: string | undefined;
  faculty?: string | undefined;
  level?: number | undefined;
  semester?: string | undefined;
}