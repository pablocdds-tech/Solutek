import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui-custom/PageHeader';
import StatusBadge from '@/components/ui-custom/StatusBadge';
import EmptyState from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  HardDrive, 
  Trash2,
  Calendar,
  Building2,
  Tag,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

export default function Ativos() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'Cozinha',
    numero_patrimonio: '',
    status: 'ativo',
    descricao: ''
  });

  // --- Queries (Supabase) ---
  const { data: ativos = [], isLoading } = useQuery({
    queryKey: ['ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ativos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  // --- Mutations (Supabase) ---
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('ativos').insert([payload]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      setModalOpen(false);
      setFormData({ nome: '', categoria: 'Cozinha', numero_patrimonio: '', status: 'ativo', descricao: '' });
      toast.success('Ativo cadastrado no Supabase!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('ativos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast.success('Ativo removido!');
    }
  });

  const filteredAtivos = ativos.filter(a => 
    a.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.numero_patrimonio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Ativos"
        subtitle="Gerencie equipamentos e patrimônio do restaurante"
        icon={HardDrive}
        breadcrumbs={[
          { label: 'Dashboard', href: 'Dashboard' },
          { label: 'Ativos' }
        ]}
        actions={
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Cadastrar Ativo
          </Button>
        }
      />

      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border p-3 rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou patrimônio..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredAtivos.length === 0 && !isLoading ? (
        <EmptyState 
          icon={HardDrive}
          title="Nenhum ativo encontrado"
          description="Cadastre seus equipamentos para controle de manutenção e inventário."
          actionLabel="Adicionar Ativo"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAtivos.map((ativo) => (
            <Card key={ativo.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Tag className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{ativo.nome}</CardTitle>
                    <p className="text-xs text-slate-500">{ativo.categoria}</p>
                  </div>
                </div>
                <StatusBadge status={ativo.status} size="xs" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{ativo.numero_patrimonio || 'S/N'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Cozinha</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Detalhes</Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => deleteMutation.mutate(ativo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Cadastro */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Equipamento / Ativo</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do Ativo *</Label>
              <Input 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})} 
                placeholder="Ex: Forno de Pizza" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cozinha">Cozinha</SelectItem>
                    <SelectItem value="Mobiliário">Mobiliário</SelectItem>
                    <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>N° Patrimônio</Label>
                <Input 
                   value={formData.numero_patrimonio} 
                   onChange={e => setFormData({...formData, numero_patrimonio: e.target.value})} 
                   placeholder="Ex: 001/2024" 
                />
              </div>
            </div>
            <div className="space-y-2">
               <Label>Descrição</Label>
               <Textarea 
                 value={formData.descricao} 
                 onChange={e => setFormData({...formData, descricao: e.target.value})} 
                 placeholder="Opcional..."
                 className="resize-none"
               />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.nome || createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar Ativo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
