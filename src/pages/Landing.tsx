import { useNavigate } from 'react-router-dom';
import { Ticket, CheckCircle, Shield, BarChart3, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  { icon: Ticket, title: 'Controle total de vales', desc: 'Gere, distribua e resgate vales com QR Code em tempo real.' },
  { icon: Shield, title: 'Segurança multi-tenant', desc: 'Cada empresa opera com isolamento total de dados.' },
  { icon: BarChart3, title: 'Relatórios completos', desc: 'Acompanhe métricas, gastos e tendências por período.' },
  { icon: Users, title: 'Múltiplos perfis', desc: 'Admin, caixa e estabelecimento com permissões distintas.' },
  { icon: Zap, title: 'Rápido e simples', desc: 'Interface intuitiva pensada para o dia a dia operacional.' },
  { icon: CheckCircle, title: 'Comece grátis', desc: 'Plano gratuito para testar sem compromisso.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Ticket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ValeFácil</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>Entrar</Button>
            <Button variant="default" onClick={() => navigate('/register')}>Criar conta</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            Sistema SaaS para gestão de vales
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
            Controle de vales <br />
            <span className="text-primary">empresariais simplificado</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Gerencie vales de combustível, alimentação e benefícios da sua empresa com segurança, 
            rastreabilidade e relatórios em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate('/register')} className="w-full sm:w-auto text-base px-8 py-6 bg-primary hover:bg-primary/90">
              Criar conta grátis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/planos')} className="w-full sm:w-auto text-base px-8 py-6">
              Ver planos
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Por que escolher o ValeFácil?</h2>
            <p className="mt-4 text-muted-foreground text-lg">Tudo que sua empresa precisa em um só lugar.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {benefits.map((b, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-muted-foreground text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Pronto para começar?</h2>
          <p className="text-muted-foreground text-lg">Crie sua conta gratuitamente e comece a gerenciar seus vales agora mesmo.</p>
          <Button size="lg" onClick={() => navigate('/register')} className="text-base px-8 py-6 bg-primary hover:bg-primary/90">
            Criar conta grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">ValeFácil</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ValeFácil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
