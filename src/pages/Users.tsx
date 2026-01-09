import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Users as UsersIcon, AlertCircle } from 'lucide-react';

export default function Users() {
  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>
        </div>

        <div className="card-elevated p-6 sm:p-8 text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Gerenciamento de Usuários</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Para criar novos usuários, acesse o painel do Lovable Cloud na aba "Users & Auth".
          </p>
          <p className="text-sm text-muted-foreground">
            Após criar o usuário, adicione sua role na tabela "user_roles" com o papel adequado (admin, caixa ou estabelecimento).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
