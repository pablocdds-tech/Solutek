import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Search, 
  Download, 
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Printer
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function Relatorios() {
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // --- Queries (Supabase) ---
  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ['relatorios', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_executions')
        .select(`
          *,
          checklists(nome, categoria)
        `)
        .gte('data', dateRange.from)
        .lte('data', dateRange.to)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const exportCSV = () => {
    if (relatorios.length === 0) return toast.error('Sem dados para exportar.');
    
    const headers = ['Data', 'Checklist', 'Conformidade', 'Status', 'Nota'];
    const rows = relatorios.map(r => [
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
      r.checklists?.nome || 'Checklist',
      `${r.percentual_conformidade}%`,
      r.aprovado ? 'Aprovado' : 'Reprovado',
      `${r.pontuacao_total}/${r.pontuacao_maxima}`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_auditoria_${dateRange.from}_a_${dateRange.to}.csv`;
    link.click();
    toast.success('Relatório exportado em CSV!');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios de Auditoria"
        subtitle="Analise o histórico e desempenho operacional"
        icon={FileText}
        breadcrumbs={[
          { label: 'Dashboard', href: 'Dashboard' },
          { label: 'Relatórios' }
        ]}
      />

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-bold uppercase text-slate-400">Início</Label>
              <Input 
                type="date" 
                value={dateRange.from} 
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-bold uppercase text-slate-400">Fim</Label>
              <Input 
                type="date" 
                value={dateRange.to} 
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              />
            </div>
            <div className="flex gap-2 col-span-1 md:col-span-2">
               <Button className="flex-1 gap-2" variant="outline" onClick={() => toast.info('Filtro avançado em breve!')}>
                  <Filter className="w-4 h-4" /> Mais Filtros
               </Button>
               <Button className="flex-1 gap-2" onClick={exportCSV}>
                  <Download className="w-4 h-4" /> Exportar CSV
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b">
           <CardTitle className="text-sm font-medium">Resultados Encontrados ({relatorios.length})</CardTitle>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                 <tr>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Auditado em</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Checklist</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Conformidade</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Pontuação</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {relatorios.map((res, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <span className="font-medium text-slate-700 dark:text-slate-200">{format(new Date(res.created_at), 'dd/MM/yyyy')}</span>
                             <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{format(new Date(res.created_at), 'HH:mm:ss')}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5" />
                             </div>
                             <span className="font-semibold">{res.checklists?.nome || '—'}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[60px]">
                                <div 
                                  className={`h-full ${res.percentual_conformidade > 80 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                  style={{ width: `${res.percentual_conformidade}%` }} 
                                />
                             </div>
                             <span className="font-mono text-xs font-bold">{res.percentual_conformidade}%</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 font-mono text-slate-400">
                          {res.pontuacao_total}/{res.pontuacao_maxima}
                       </td>
                       <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${res.aprovado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                             {res.aprovado ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                             {res.aprovado ? 'Aprovado' : 'Reprovado'}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                             <Printer className="w-4 h-4" />
                          </Button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           
           {relatorios.length === 0 && !isLoading && (
              <div className="py-20 text-center">
                 <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                 <p className="text-slate-400 text-sm">Nenhum resultado para este período.</p>
              </div>
           )}
        </div>
      </Card>
    </div>
  );
}