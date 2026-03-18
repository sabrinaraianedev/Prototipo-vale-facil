import { useNavigate } from 'react-router-dom';
import { Ticket, Check, ArrowLeft, Crown, Zap, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';

const plans = [
  {
    name: 'Free',
    icon: Zap,
    price: 'R$ 0',
    period: '/mês',
    description: 'Para começar a testar o sistema sem compromisso.',
    features: [
      'Até 3 usuários',
      'Até 50 vales/mês',
      '1 tipo de vale',
      'Relatórios básicos',
    ],
    buttonLabel: 'Plano atual',
    highlighted: false,
    planKey: 'free',
  },
  {
    name: 'Basic',
    icon: Crown,
    price: 'R$ 49',
    period: '/mês',
    description: 'Para pequenas empresas que precisam de mais controle.',
    features: [
      'Até 10 usuários',
      'Até 500 vales/mês',
      'Tipos de vale ilimitados',
      'Relatórios completos',
      'Exportação em PDF',
    ],
    buttonLabel: 'Assinar Basic',
    highlighted: true,
    planKey: 'basico',
  },
  {
    name: 'Pro',
    icon: Rocket,
    price: 'R$ 99',
    period: '/mês',
    description: 'Para empresas que precisam de funcionalidades avançadas.',
    features: [
      'Usuários ilimitados',
      'Vales ilimitados',
      'Tipos de vale ilimitados',
      'Relatórios avançados',
      'Exportação em PDF e Excel',
      'Suporte prioritário',
    ],
    buttonLabel: 'Assinar Pro',
    highlighted: false,
    planKey: 'pro',
  },
];

function PlansContent() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSubscribe = (planKey: string) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    // Placeholder for future payment integration
    alert(`Integração de pagamento para o plano "${planKey}" será implementada em breve.`);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Escolha seu plano</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Comece grátis e faça upgrade quando sua empresa precisar de mais recursos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.planKey}
            className={`relative bg-card rounded-2xl border p-6 sm:p-8 flex flex-col transition-shadow ${
              plan.highlighted
                ? 'border-primary shadow-lg ring-2 ring-primary/20'
                : 'border-border shadow-sm hover:shadow-md'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Mais popular
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                plan.highlighted ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
              }`}>
                <plan.icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>

            <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe(plan.planKey)}
              variant={plan.highlighted ? 'default' : 'outline'}
              className={`w-full h-11 ${plan.highlighted ? 'bg-primary hover:bg-primary/90' : ''}`}
              disabled={plan.planKey === 'free'}
            >
              {plan.buttonLabel}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Plans() {
  const { isAuthenticated } = useAuth();

  // If logged in, show inside dashboard layout
  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <PlansContent />
      </DashboardLayout>
    );
  }

  // Public view
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Ticket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ValeFácil</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => window.location.href = '/login'}>Entrar</Button>
            <Button variant="default" onClick={() => window.location.href = '/register'}>Criar conta</Button>
          </div>
        </div>
      </header>

      <section className="py-16 px-4 sm:px-6">
        <PlansContent />
      </section>

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
