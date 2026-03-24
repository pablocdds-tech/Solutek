import { 
  LayoutDashboard, 
  CheckSquare, 
  HardDrive, 
  Building2, 
  Users, 
  FileText,
  Settings,
  Heart
} from 'lucide-react';

// Importação das páginas refatoradas (Supabase Ready)
import Dashboard from './pages/Dashboard';
import Checklists from './pages/Checklists';
import Ativos from './pages/Ativos';
import Lojas from './pages/Lojas';
import Usuarios from './pages/Usuarios';
import Relatorios from './pages/Relatorios';

export const pagesConfig = [
  {
    id: 'Dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    component: Dashboard,
    group: 'principal'
  },
  {
    id: 'Checklists',
    label: 'Checklists',
    icon: CheckSquare,
    component: Checklists,
    group: 'operacao'
  },
  {
    id: 'Ativos',
    label: 'Ativos',
    icon: HardDrive,
    component: Ativos,
    group: 'operacao'
  },
  {
    id: 'Relatorios',
    label: 'Relatórios',
    icon: FileText,
    component: Relatorios,
    group: 'operacao'
  },
  {
    id: 'Lojas',
    label: 'Estabelecimentos',
    icon: Building2,
    component: Lojas,
    group: 'configuracoes'
  },
  {
    id: 'Usuarios',
    label: 'Equipe e Acesso',
    icon: Users,
    component: Usuarios,
    group: 'configuracoes'
  }
];

export const menuGroups = [
  { id: 'principal', label: 'Início' },
  { id: 'operacao', label: 'Operação' },
  { id: 'configuracoes', label: 'Gestão' }
];

export const appBrand = {
  name: 'Vitaliano ERP',
  logo: Heart,
  version: '2.0.0 (Supabase Core)'
};