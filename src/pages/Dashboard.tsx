import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AdminDashboard } from '@/components/Dashboard/AdminDashboard';
import { CashierDashboard } from '@/components/Dashboard/CashierDashboard';
import { EstablishmentDashboard } from '@/components/Dashboard/EstablishmentDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'caixa' && <CashierDashboard />}
      {user.role === 'estabelecimento' && <EstablishmentDashboard />}
    </DashboardLayout>
  );
}
