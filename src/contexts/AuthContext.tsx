import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'caixa' | 'estabelecimento';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: { email: string; password: string; user: User }[] = [
  {
    email: 'admin@gmail.com',
    password: 'admin',
    user: { id: '1', email: 'admin@gmail.com', name: 'Administrador', role: 'admin' }
  },
  {
    email: 'caixa@gmail.com',
    password: 'caixa',
    user: { id: '2', email: 'caixa@gmail.com', name: 'Caixa Principal', role: 'caixa' }
  },
  {
    email: 'estabelecimento@gmail.com',
    password: 'estabelecimento',
    user: { id: '3', email: 'estabelecimento@gmail.com', name: 'Conveniência Central', role: 'estabelecimento' }
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('valefacil_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const found = mockUsers.find(u => u.email === email && u.password === password);
    
    if (found) {
      setUser(found.user);
      localStorage.setItem('valefacil_user', JSON.stringify(found.user));
      return { success: true };
    }
    
    return { success: false, error: 'E-mail ou senha incorretos' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('valefacil_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
