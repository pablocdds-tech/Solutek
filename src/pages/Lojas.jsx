import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  MapPin, 
  Store, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Building2,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

export default function Lojas() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    ativa: true
  });

  // --- Queries (Supabase) ---
  const { data: lojas = [], isLoading } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  // --- Mutations (Supabase) ---
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('lojas').insert([payload]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      setModalOpen(false);
      setFormData({ nome: '', endereco: '', ativa: true });
      toast.success('Estabelecimento cadastrado no Supabase!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('lojas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success('Unidade removida!');
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estabelecimentos"
        subtitle="Gerencie as unidades e lojas do restaurante"
        icon={Building2}
        breadcrumbs={[
          { label: 'Dashboard', href: 'Dashboard' },
          { label: 'Lojas' }
        ]}
        actions={
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Unidade
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lojas.map((loja) => (
          <Card key={loja.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{loja.nome}</CardTitle>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${loja.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {loja.ativa ? 'Ativa' : 'Inativa'}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{loja.endereco || 'Endereço não informado'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">Configurar</Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    if(confirm('Deseja realmente excluir esta unidade?')) {
                      deleteMutation.mutate(loja.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {lojas.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma loja cadastrada</h3>
            <p className="text-slate-400 text-sm mb-4">Cadastre a primeira unidade para começar as auditorias.</p>
            <Button onClick={() => setModalOpen(true)}>Cadastrar Matriz</Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Estabelecimento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da Unidade / Loja *</Label>
              <Input 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})} 
                placeholder="Ex: Vitaliano Pizzaria - Matriz" 
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço Completo</Label>
              <Input 
                 value={formData.endereco} 
                 onChange={e => setFormData({...formData, endereco: e.target.value})} 
                 placeholder="Rua, Número, Bairro, Cidade" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.nome || createMutation.isPending}>
               Salvar Unidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}