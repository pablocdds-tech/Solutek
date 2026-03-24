import React, { useState, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/tabs";
import { 
  CheckSquare, 
  Plus, 
  Play, 
  ClipboardList,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Checklists() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [executeModal, setExecuteModal] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [detailModal, setDetailModal] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: 'abertura',
    frequencia: 'diario',
    itens: []
  });
  const [novoItem, setNovoItem] = useState({ 
    pergunta: '', 
    tipo_resposta: 'sim_nao', 
    obrigatorio: true, 
    requires_photo: false 
  });
  const fileInputRef = useRef(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Queries (Supabase) ---
  
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklists')
        .select(`
          *,
          items:checklist_items(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: respostasHoje = [] } = useQuery({
    queryKey: ['respostas-checklist-hoje'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('checklist_executions')
        .select('*')
        .eq('data', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: historicoRespostas = [] } = useQuery({
    queryKey: ['respostas-checklist-historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
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

  // --- Mutations (Supabase) ---

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { items, ...checklistData } = payload;
      
      // 1. Criar o Checklist
      const { data: checklist, error: chkError } = await supabase
        .from('checklists')
        .insert([checklistData])
        .select()
        .single();
      
      if (chkError) throw chkError;

      // 2. Criar os Itens vinculados
      if (items && items.length > 0) {
        const itemsWithId = items.map(it => ({ ...it, checklist_id: checklist.id }));
        const { error: itemsError } = await supabase
          .from('checklist_items')
          .insert(itemsWithId);
        if (itemsError) throw itemsError;
      }
      
      return checklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setModalOpen(false);
      resetForm();
      toast.success('Checklist criado no Supabase!');
    },
    onError: (err) => toast.error('Erro ao salvar: ' + err.message)
  });

  const createRespostaMutation = useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase
        .from('checklist_executions')
        .insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respostas-checklist-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['respostas-checklist-historico'] });
      setExecuteModal(null);
      setRespostas({});
      setCurrentStep(0);
      toast.success('Checklist finalizado com sucesso!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('checklists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist removido!');
    }
  });

  // --- Helpers ---

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', categoria: 'abertura', frequencia: 'diario', itens: [] });
  };

  const addItem = () => {
    if (!novoItem.pergunta.trim()) return;
    setFormData({
      ...formData,
      itens: [...formData.itens, { ...novoItem, ordem: formData.itens.length + 1 }]
    });
    setNovoItem({ pergunta: '', tipo_resposta: 'sim_nao', obrigatorio: true, requires_photo: false });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalItems = [...formData.itens];
    if (novoItem.pergunta.trim()) {
      finalItems.push({ ...novoItem, ordem: finalItems.length + 1 });
    }
    if (finalItems.length === 0) return toast.error('Adicione perguntas ao checklist.');
    createMutation.mutate({ ...formData, itens: finalItems });
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 1024, MAX_H = 1024;
          let { width: w, height: h } = img;
          if (w > MAX_W || h > MAX_H) {
            const r = Math.min(MAX_W / w, MAX_H / h);
            w *= r; h *= r;
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file || activePhotoIdx === null) return;
    
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `execution_${Date.now()}_${activePhotoIdx}.jpg`;
      
      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('checklist-photos')
        .upload(fileName, compressed);
      
      if (error) throw error;

      // Pegar URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('checklist-photos')
        .getPublicUrl(fileName);

      setRespostas(prev => ({
        ...prev,
        [activePhotoIdx]: {
          ...prev[activePhotoIdx],
          photo: publicUrl,
          photoPreview: URL.createObjectURL(compressed)
        }
      }));
      toast.success('Foto enviada!');
    } catch (err) {
      toast.error('Erro foto: ' + err.message);
    } finally {
      setUploading(false);
      setActivePhotoIdx(null);
    }
  };

  const handleExecute = () => {
    if (!executeModal) return;
    const total = executeModal.items?.length || 0;
    const answersArray = executeModal.items?.map((it, idx) => ({
      ...it,
      valor: respostas[idx]?.valor || '',
      conforme: respostas[idx]?.valor === 'sim' || respostas[idx]?.valor === '5',
      observacao: respostas[idx]?.observacao || '',
      foto_url: respostas[idx]?.photo || null
    })) || [];

    const ok = answersArray.filter(a => a.conforme).length;
    const perc = total > 0 ? (ok / total) * 100 : 0;

    createRespostaMutation.mutate({
      checklist_id: executeModal.id,
      loja_id: lojas[0]?.id || null,
      data: format(new Date(), 'yyyy-MM-dd'),
      hora_inicio: new Date().toISOString(),
      hora_fim: new Date().toISOString(),
      respostas: answersArray,
      pontuacao_total: ok,
      pontuacao_maxima: total,
      percentual_conformidade: perc,
      aprovado: perc >= 80,
      status: 'concluido'
    });
  };

  // --- UI Vars ---
  const currentItem = executeModal?.items?.[currentStep];
  const totalSteps = executeModal?.items?.length || 0;
  const canFinish = executeModal?.items?.every((it, idx) => {
    if (it.requires_photo && !respostas[idx]?.photo) return false;
    return !!respostas[idx]?.valor;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists (Supabase)"
        subtitle="Auditoria operacional baseada em Supabase"
        icon={CheckSquare}
        breadcrumbs={[{ label: 'Dashboard', href: 'Dashboard' }, { label: 'Checklists' }]}
        actions={
          <Button onClick={() => { resetForm(); setModalOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Checklist
          </Button>
        }
      />

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {checklists.length === 0 && !isLoading ? (
            <EmptyState icon={CheckSquare} title="Sem checklists no Supabase" description="Crie seu primeiro checklist auditável." onAction={() => setModalOpen(true)} actionLabel="Criar Agora" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checklists.map((chk) => {
                const respondido = respostasHoje.some(r => r.checklist_id === chk.id);
                return (
                  <Card key={chk.id} className="hover:shadow-md transition-all">
                    <CardHeader className="pb-3 flex-row items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                          <CardTitle className="text-base">{chk.nome}</CardTitle>
                          <p className="text-xs text-slate-500 capitalize">{chk.categoria}</p>
                        </div>
                      </div>
                      <StatusBadge status={respondido ? 'concluido' : 'pendente'} size="xs" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span><ClipboardList className="w-3.5 h-3.5 inline mr-1" /> {chk.items?.length || 0} itens</span>
                        <span><Calendar className="w-3.5 h-3.5 inline mr-1" /> {chk.frequencia}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" disabled={respondido} onClick={() => { setExecuteModal(chk); setCurrentStep(0); setRespostas({}); }}>
                          <Play className="w-4 h-4" /> {respondido ? 'Concluído Hoje' : 'Executar'}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(chk.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hoje" className="mt-4">
          <div className="space-y-3">
            {respostasHoje.map(res => (
              <Card key={res.id} className="cursor-pointer" onClick={() => setDetailModal(res)}>
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      {res.aprovado ? <CheckCircle2 className="text-emerald-500 w-5 h-5"/> : <XCircle className="text-red-500 w-5 h-5" />}
                      <div>
                        <p className="font-medium text-sm">{checklists.find(c => c.id === res.checklist_id)?.nome}</p>
                        <p className="text-xs text-slate-400">{format(new Date(res.created_at), 'HH:mm')}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-sm font-bold">{res.percentual_conformidade}%</span>
                      <Eye className="w-4 h-4 text-slate-300" />
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="space-y-3">
             {historicoRespostas.map(res => (
              <Card key={res.id} className="cursor-pointer" onClick={() => setDetailModal(res)}>
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${res.aprovado ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium text-sm">{checklists.find(c => c.id === res.checklist_id)?.nome || 'Checklist'}</p>
                        <p className="text-xs text-slate-400">{format(new Date(res.data), 'dd/MM/yyyy')}</p>
                      </div>
                   </div>
                   <StatusBadge status={res.aprovado ? 'aprovado' : 'reprovado'} size="xs" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

      {/* Modal Criar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Template de Checklist</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abertura">Abertura</SelectItem>
                    <SelectItem value="fechamento">Fechamento</SelectItem>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-3">
               <Label className="text-xs uppercase text-slate-400 font-bold">Adicionar Pergunta</Label>
               <div className="flex gap-2">
                 <Input value={novoItem.pergunta} onChange={e => setNovoItem({...novoItem, pergunta: e.target.value})} placeholder="Ex: Piso está seco?" className="flex-1" />
                 <Button type="button" onClick={addItem} size="icon"><Plus className="w-4 h-4"/></Button>
               </div>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={novoItem.requires_photo} onCheckedChange={v => setNovoItem({...novoItem, requires_photo: v})} />
                    <span className="text-xs">Exigir Foto</span>
                  </div>
               </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {formData.itens.map((it, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border rounded text-sm">
                   <span>{it.pergunta}</span>
                   {it.requires_photo && <Camera className="w-3.5 h-3.5 text-blue-500" />}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>Salvar no Supabase</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Execução Passo a Passo */}
      <Dialog open={!!executeModal} onOpenChange={() => setExecuteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{executeModal?.nome}</DialogTitle>
            <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-1.5 mt-2" />
          </DialogHeader>

          {currentItem && (
            <div className="space-y-6 py-4">
               <p className="text-lg font-bold">{currentStep+1}. {currentItem.pergunta}</p>
               
               <div className="grid grid-cols-2 gap-3">
                  <Button variant={respostas[currentStep]?.valor === 'sim' ? 'default' : 'outline'} className="h-16 text-lg" onClick={() => setRespostas({...respostas, [currentStep]: {...respostas[currentStep], valor: 'sim'}})}>SIM</Button>
                  <Button variant={respostas[currentStep]?.valor === 'nao' ? 'destructive' : 'outline'} className="h-16 text-lg" onClick={() => setRespostas({...respostas, [currentStep]: {...respostas[currentStep], valor: 'nao'}})}>NÃO</Button>
               </div>

               {currentItem.requires_photo && (
                  <div className="mt-4">
                    {respostas[currentStep]?.photo ? (
                      <div className="relative rounded-lg overflow-hidden h-40 border">
                        <img src={respostas[currentStep].photo} className="w-full h-full object-cover" />
                        <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => setRespostas({...respostas, [currentStep]: {...respostas[currentStep], photo: null}})}><X className="w-4 h-4"/></Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full h-24 border-dashed flex-col gap-2" disabled={uploading} onClick={() => { setActivePhotoIdx(currentStep); fileInputRef.current.click(); }}>
                        <Camera className="w-6 h-6" />
                        {uploading ? 'Enviando...' : 'Tirar Foto Obrigatória'}
                      </Button>
                    )}
                  </div>
               )}
            </div>
          )}

          <DialogFooter className="justify-between sm:justify-between">
             <Button variant="ghost" onClick={() => setCurrentStep(s => Math.max(0, s-1))} disabled={currentStep===0}>Anterior</Button>
             {currentStep < totalSteps - 1 ? (
               <Button onClick={() => setCurrentStep(s => s+1)} disabled={!respostas[currentStep]?.valor || (currentItem?.requires_photo && !respostas[currentStep]?.photo)}>Próximo</Button>
             ) : (
               <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExecute} disabled={createRespostaMutation.isPending || !canFinish}>Finalizar</Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Resumo da Inspeção</DialogTitle></DialogHeader>
          {detailModal && (
            <div className="space-y-4">
               {detailModal.respostas?.map((r, i) => (
                 <div key={i} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium">{r.pergunta}</p>
                      {r.conforme ? <CheckCircle2 className="text-emerald-500 w-4 h-4"/> : <XCircle className="text-red-500 w-4 h-4" />}
                    </div>
                    {r.foto_url && <img src={r.foto_url} className="mt-2 rounded w-full h-32 object-cover" />}
                 </div>
               ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}