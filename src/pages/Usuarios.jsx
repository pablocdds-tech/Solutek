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
  Users, 
  Trash2, 
  ShieldCheck, 
  Mail, 
  UserCircle2,
  Lock,
  Eye,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    role: 'funcionario',
    loja_id: ''
  });

  // --- Queries (Supabase) ---
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      // Nota: No Supabase Real as tabelas de perfis geralmente chamam-se 'profiles' ou 'users' pública
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');
      
      // Fallback amigável se a tabela de perfis ainda não existir
      if (error && error.code === '42P01') {
        return []; 
      }
      if (error) throw error;
      return data || [];
    }
  });

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lojas').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      // Nota: Convite de usuário via Supabase exige Auth.
      // Aqui criamos apenas o perfil público para teste.
      const { data, error } = await supabase.from('profiles').insert([payload]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setModalOpen(false);
      setFormData({ email: '', nome: '', role: 'funcionario', loja_id: '' });
      toast.success('Pefil de usuário criado no Supabase!');
    },
    onError: (err) => {
       if(err.code === '42P01') {
         toast.error('Tabela "profiles" não existe no Supabase. Crie-a no SQL Editor primeiro!');
       } else {
         toast.error('Erro: ' + err.message);
       }
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Acessos"
        subtitle="Gerencie quem pode acessar e auditar o restaurante"
        icon={Users}
        breadcrumbs={[
          { label: 'Dashboard', href: 'Dashboard' },
          { label: 'Usuários' }
        ]}
        actions={
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Usuário
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                  <UserCircle2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{user.nome || 'Usuário'}</CardTitle>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {user.role}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Permissões: {user.role === 'admin' ? 'Total' : 'Auditores'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                   <Settings2 className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 text-red-500">
                   <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {profiles.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center">
            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum perfil de funcionário</h3>
            <p className="text-slate-400 text-sm mb-6">Comece cadastrando sua equipe para monitorar as auditorias.</p>
            <Button onClick={() => setModalOpen(true)}>Convidar Membro</Button>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Convidar Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input 
                 value={formData.nome} 
                 onChange={e => setFormData({...formData, nome: e.target.value})} 
                 placeholder="Digite o nome do funcionário" 
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail (Acesso)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                   value={formData.email} 
                   onChange={e => setFormData({...formData, email: e.target.value})} 
                   placeholder="exemplo@email.com" 
                   className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <Label>Perfil/Nível</Label>
                 <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="admin">Administrador</SelectItem>
                       <SelectItem value="gestor">Gestor / Gerente</SelectItem>
                       <SelectItem value="funcionario">Funcionário / Auditor</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-1.5">
                 <Label>Loja Alocada</Label>
                 <Select value={formData.loja_id} onValueChange={v => setFormData({...formData, loja_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                       {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.email || createMutation.isPending}>
               Criar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}