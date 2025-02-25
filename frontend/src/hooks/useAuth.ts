import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePhoto?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;  // Add this line
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
