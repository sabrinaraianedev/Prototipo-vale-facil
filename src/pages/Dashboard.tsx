import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { AdminDashboard } from '@/components/Dashboard/AdminDashboard';
import { CashierDashboard } from '@/components/Dashboard/CashierDashboard';
import { EstablishmentDashboard } from '@/components/Dashboard/EstablishmentDashboard';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [plano, setPlano] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.establishmentId) {
      supabase
        .from('establishments')
        .select('plano')
        .eq('id', user.establishmentId)
        .single()
        .then(({ data }) => {
          if (data) setPlano(data.plano);
        });
    }
  }, [user?.establishmentId]);

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

  const planLabel: Record<string, string> = {
    free: 'Free',
    basico: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const planColor: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    basico: 'bg-primary/15 text-primary',
    pro: 'bg-warning/15 text-warning',
    enterprise: 'bg-destructive/15 text-destructive',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Plan badge + upgrade alert */}
        {plano && (user.role === 'admin' || user.role === 'super_admin') && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Plano atual:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${planColor[plano] || planColor.free}`}>
                <Crown className="h-3.5 w-3.5" />
                {planLabel[plano] || plano}
              </span>
            </div>

            {plano === 'free' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-3 flex-1">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Você está no plano gratuito</p>
                    <p className="text-xs text-muted-foreground">Faça upgrade para ter acesso a recursos ilimitados.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/planos')} className="bg-primary hover:bg-primary/90">
                  Fazer upgrade
                </Button>
              </div>
            )}
          </div>
        )}

        {(user.role === 'admin' || user.role === 'super_admin') && <AdminDashboard />}
        {user.role === 'caixa' && <CashierDashboard />}
        {user.role === 'estabelecimento' && <EstablishmentDashboard />}
      </div>
    </DashboardLayout>
  );
}
