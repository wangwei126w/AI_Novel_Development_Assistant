export interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  nickname?: string;
  email?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface AdminUpdateUserData {
  nickname?: string;
  email?: string;
  role?: 'admin' | 'user';
}
