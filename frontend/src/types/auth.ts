export type UserRole = 'volunteer' | 'scholar' | 'sponsor' | 'admin' | 'staff';

export interface User {
  id: number;
  email: string;
  name: string;
  username: string;
  profilePhoto?: string | null;
  coverPhoto?: string | null;
  intro?: string;
  knownAs?: string;
  dateOfBirth?: string;
  phone?: string;
  role: UserRole;
  hasSubmittedReport?: boolean;
  verificationStep?: number;
  salaryRange?: string; // Add this property
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  message: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface PhotoUpdateResponse {
  user: User;
}

export interface UserInfoUpdateResponse {
  user: User;
}

export interface UserDetailsUpdateResponse {
  user: User;
}

export interface RegistrationResponse {
  message: string;
  user: User;
}

export interface EmailVerificationResponse {
  message: string;
}

export interface AdminStats {
  totalUsers: number;
  activePrograms: number;
  totalDonations: number;
  activeScholars: number;
}

export interface ReportCardSubmissionResponse {
  message: string;
  reportCard: {
    id: number;
    userId: number;
    frontImage: string;
    backImage: string;
    gradeLevel: string; // Add this field
    status: string;
    verificationStep: number;
    submittedAt: string;
    updatedAt: string;
  };
}

