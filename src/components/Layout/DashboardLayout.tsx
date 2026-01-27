import { ReactNode, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = forwardRef<HTMLDivElement, DashboardLayoutProps>(
  function DashboardLayout({ children }, ref) {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        navigate('/login');
      }
    }, [isAuthenticated, loading, navigate]);

    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!isAuthenticated) return null;

    return (
      <div ref={ref} className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:pl-72 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    );
  }
);
