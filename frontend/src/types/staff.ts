export interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export interface StaffFormData {
  name: string;
  email: string;
  password?: string;
  department: string;
  phone: string;
  status: string;
}
