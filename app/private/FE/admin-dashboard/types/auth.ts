// 인증 관련 타입 정의

export interface User {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface LoginCredentials {
  name: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
}
