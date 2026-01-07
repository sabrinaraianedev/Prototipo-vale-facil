import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'caixa' | 'estabelecimento';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  users: SystemUser[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  addUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => void;
  toggleUserStatus: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialUsers: SystemUser[] = [
  { id: '1', name: 'Administrador', email: 'admin@gmail.com', password: 'admin', role: 'admin', active: true, createdAt: new Date() },
  { id: '2', name: 'Caixa Principal', email: 'caixa@gmail.com', password: 'caixa', role: 'caixa', active: true, createdAt: new Date() },
  { id: '3', name: 'Conveniência Central', email: 'estabelecimento@gmail.com', password: 'estabelecimento', role: 'estabelecimento', active: true, createdAt: new Date() },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('valefacil_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const found = users.find(u => u.email === email && u.password === password && u.active);
    
    if (found) {
      const loggedUser: User = {
        id: found.id,
        email: found.email,
        name: found.name,
        role: found.role,
      };
      setUser(loggedUser);
      localStorage.setItem('valefacil_user', JSON.stringify(loggedUser));
      return { success: true };
    }
    
    return { success: false, error: 'E-mail ou senha incorretos' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('valefacil_user');
  };

  const addUser = (userData: Omit<SystemUser, 'id' | 'createdAt'>) => {
    const newUser: SystemUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, active: !user.active } : user
    ));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      login, 
      logout, 
      isAuthenticated: !!user,
      addUser,
      toggleUserStatus,
    }}>
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
