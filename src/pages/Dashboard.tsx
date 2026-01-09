import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AdminDashboard } from '@/components/Dashboard/AdminDashboard';
import { CashierDashboard } from '@/components/Dashboard/CashierDashboard';
import { EstablishmentDashboard } from '@/components/Dashboard/EstablishmentDashboard';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'caixa' && <CashierDashboard />}
      {user.role === 'estabelecimento' && <EstablishmentDashboard />}
    </DashboardLayout>
  );
}
