import React from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  LayoutDashboard,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  // --- Queries (Supabase) ---
  const { data: execucoes = [], isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_executions')
        .select('*')
        .eq('data', today);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: ultimosChecklists = [] } = useQuery({
    queryKey: ['recent-executions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_executions')
        .select(`
          *,
          checklists(nome)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  // --- Stats Calculations ---
  const total = execucoes.length;
  const aprovados = execucoes.filter(e => e.aprovado).length;
  const reprovados = total - aprovados;
  const conformidadeMedia = total > 0 
    ? (execucoes.reduce((acc, curr) => acc + Number(curr.percentual_conformidade), 0) / total).toFixed(0)
    : 0;

  const chartData = [
    { name: 'Aprovados', value: aprovados, color: '#10b981' },
    { name: 'Reprovados', value: reprovados, color: '#ef4444' }
  ];

  if (isLoading) return <div className="p-8 text-center">Carregando Dashboard...</div>

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Painel Vitaliano ERP" 
        subtitle="Monitoramento em tempo real da operação"
        icon={LayoutDashboard}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Execuções Hoje" 
          value={total} 
          icon={Clock} 
          color="blue"
          description="Total de checklists finalizados"
        />
        <StatsCard 
          title="Aprovados" 
          value={aprovados} 
          icon={CheckCircle2} 
          color="emerald"
          description="Dentro dos padrões de qualidade"
        />
        <StatsCard 
          title="Reprovados" 
          value={reprovados} 
          icon={XCircle} 
          color="red"
          description="Necessitam atenção imediata"
        />
        <StatsCard 
          title="Conformidade" 
          value={`${conformidadeMedia}%`} 
          icon={TrendingUp} 
          color="amber"
          description="Média de pontuação geral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Qualidade */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status de Auditoria (Hoje)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Nenhum dado para hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Atividades */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ultimosChecklists.length > 0 ? (
              ultimosChecklists.map((res, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${res.aprovado ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {res.aprovado ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{res.checklists?.nome || 'Checklist'}</p>
                      <p className="text-xs text-slate-400">{format(new Date(res.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${res.aprovado ? 'text-emerald-600' : 'text-red-600'}`}>
                      {res.percentual_conformidade}%
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Conformidade</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-12 text-slate-400">Aguardando as primeiras inspeções...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, description }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
    red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
  };

  return (
    <Card className={`border shadow-sm`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</CardTitle>
        <p className="text-[11px] text-slate-400 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}