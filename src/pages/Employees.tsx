import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { UserCheck, Plus, Trash2, Building } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  nome: string;
  cpf: string | null;
  setor: string | null;
  active: boolean;
  establishment_id: string;
}

export default function Employees() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    setor: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchEmployees();
    }
  }, [isAuthenticated, user]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do funcionário');
      return;
    }

    if (!user?.establishmentId) {
      toast.error('Usuário não vinculado a uma empresa');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .insert({
          nome: formData.nome.trim(),
          cpf: formData.cpf.trim() || null,
          setor: formData.setor.trim() || null,
          establishment_id: user.establishmentId,
        })
        .select()
        .single();

      if (error) throw error;

      setEmployees(prev => [...prev, data]);
      setFormData({ nome: '', cpf: '', setor: '' });
      setIsDialogOpen(false);
      toast.success('Funcionário cadastrado com sucesso!');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast.error(error.message || 'Erro ao cadastrar funcionário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.map(e => e.id === id ? { ...e, active: !currentStatus } : e));
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success(`Funcionário ${nome} excluído`);
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    }
  };

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Funcionários</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Gerencie os colaboradores da empresa</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto">
                <Plus className="h-5 w-5" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: João Silva"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (opcional)</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setor">Setor (opcional)</Label>
                  <Input
                    id="setor"
                    placeholder="Ex: Logística"
                    value={formData.setor}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee List */}
        {employees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {employees.map((emp) => (
              <div key={emp.id} className={cn("card-elevated p-4 sm:p-6 space-y-4 transition-all", !emp.active && "opacity-60")}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                      <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{emp.nome}</h3>
                      {emp.cpf && <p className="text-xs text-muted-foreground">{emp.cpf}</p>}
                      {emp.setor && (
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span className="text-xs">{emp.setor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={emp.active}
                    onCheckedChange={() => toggleStatus(emp.id, emp.active)}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className={`text-xs px-2 py-1 rounded-full ${emp.active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {emp.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {emp.nome}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(emp.id, emp.nome)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-8 sm:p-12 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum funcionário cadastrado</h3>
            <p className="text-muted-foreground mb-4">Cadastre os colaboradores da empresa</p>
            <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-5 w-5" />
              Cadastrar Funcionário
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
