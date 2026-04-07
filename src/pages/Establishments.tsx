import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Store, Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EstablishmentItem {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export default function Establishments() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { refreshData } = useVouchers();
  const navigate = useNavigate();
  const [establishments, setEstablishments] = useState<EstablishmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEstablishments();
    }
  }, [isAuthenticated]);

  const fetchEstablishments = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, active, created_at')
        .order('name');

      if (error) throw error;
      setEstablishments(data || []);
    } catch (error) {
      console.error('Error fetching establishments:', error);
      toast.error('Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Informe o nome do estabelecimento');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('establishments')
          .update({ name: formName.trim() })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Estabelecimento atualizado!');
      } else {
        const { error } = await supabase
          .from('establishments')
          .insert({ name: formName.trim() });
        if (error) throw error;
        toast.success('Estabelecimento criado!');
      }
      setFormName('');
      setEditingId(null);
      setIsDialogOpen(false);
      fetchEstablishments();
      refreshData();
    } catch (error: any) {
      console.error('Error saving establishment:', error);
      toast.error(error.message || 'Erro ao salvar estabelecimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('establishments')
        .update({ active: !currentActive })
        .eq('id', id);
      if (error) throw error;
      toast.success(currentActive ? 'Estabelecimento desativado' : 'Estabelecimento ativado');
      fetchEstablishments();
      refreshData();
    } catch (error) {
      console.error('Error toggling establishment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Estabelecimento excluído');
      setEstablishments(prev => prev.filter(e => e.id !== id));
      refreshData();
    } catch (error: any) {
      console.error('Error deleting establishment:', error);
      toast.error('Erro ao excluir. Verifique se não há vales vinculados.');
    }
  };

  const openEdit = (est: EstablishmentItem) => {
    setEditingId(est.id);
    setFormName(est.name);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setIsDialogOpen(true);
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

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Estabelecimentos</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Gerencie os locais onde os vales podem ser utilizados</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto" onClick={openCreate}>
                <Plus className="h-5 w-5" />
                Novo Estabelecimento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="estName">Nome</Label>
                  <Input
                    id="estName"
                    placeholder="Ex: Restaurante Central"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {establishments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {establishments.map((est) => (
              <div key={est.id} className="card-elevated p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                    <Store className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{est.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(est.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className={`text-xs px-2 py-1 rounded-full ${est.active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {est.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(est.id, est.active)}>
                      {est.active ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-success" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(est)}>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir estabelecimento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir {est.name}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(est.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-8 sm:p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum estabelecimento cadastrado</h3>
            <p className="text-muted-foreground mb-4">Crie estabelecimentos para vincular aos vales</p>
            <Button variant="gradient" onClick={openCreate}>
              <Plus className="h-5 w-5" />
              Criar Estabelecimento
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
