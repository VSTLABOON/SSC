// ---------------------------------------------------------------------------
// Datos mock para la pantalla de Inicio (Dashboard).
// Reemplazar por llamadas reales cuando exista backend.
// ---------------------------------------------------------------------------

export interface StudentInfo {
  name: string;
  enrollment: string;
  group: string;
  schoolCycle: string;
}

export const studentInfo: StudentInfo = {
  name: 'Agustín Pérez',
  enrollment: '21001020-5',
  group: 'SOMA-402',
  schoolCycle: 'Ciclo Escolar 2020-2023',
};

export type BehaviorLevel = 'green' | 'yellow' | 'red';

export interface BehaviorStatus {
  level: BehaviorLevel;
  label: string;
  sublabel: string;
  description: string;
}

export const behaviorStatus: BehaviorStatus = {
  level: 'green',
  label: 'Verde',
  sublabel: '(Buen Desempeño)',
  description: 'Se activa de forma automática por dificultades académicas o más de 3 faltas.',
};

export type ComplianceLevel = 'optimo' | 'riesgo';

export interface ComplianceMonth {
  month: string;
  value: number;
  status: ComplianceLevel;
}

export const complianceHistory: ComplianceMonth[] = [
  { month: 'Feb', value: 98, status: 'optimo' },
  { month: 'Mar', value: 85, status: 'optimo' },
  { month: 'Abr', value: 65, status: 'riesgo' },
  { month: 'May', value: 72, status: 'riesgo' },
  { month: 'Jun', value: 88, status: 'optimo' },
];

export interface AttendanceSummary {
  percentage: number;
  note: string;
}

export const attendance: AttendanceSummary = {
  percentage: 94,
  note: 'Mantienes un buen desempeño, sigue manteniendo este nivel.',
};

export interface UpcomingNotice {
  title: string;
  description: string;
  date: string;
}

export const upcomingNotice: UpcomingNotice = {
  title: 'Aviso Próximo',
  description: 'Reunión de tutoría para alumnos en semáforo amarillo.',
  date: 'Viernes 15 Jul, 10:00 AM',
};

export type ActivityCategory = 'inasistencia' | 'participacion' | 'conducta';

export interface ActivityRecord {
  date: string;
  category: ActivityCategory;
  categoryLabel: string;
  description: string;
  impact: number;
}

export const recentActivity: ActivityRecord[] = [
  {
    date: '12 Jun 2026',
    category: 'inasistencia',
    categoryLabel: 'Inasistencia',
    description: 'Inasistencia injustificada en Matemáticas IV',
    impact: -5,
  },
  {
    date: '10 Jun 2026',
    category: 'participacion',
    categoryLabel: 'Participación',
    description: 'Excelente desempeño en proyecto de Redes',
    impact: 10,
  },
  {
    date: '08 Jun 2026',
    category: 'conducta',
    categoryLabel: 'Conducta',
    description: 'Uso indebido de celular en clase',
    impact: -2,
  },
];

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'profile', label: 'Perfil', icon: 'person' },
  { id: 'schedule', label: 'Horario', icon: 'schedule' },
  { id: 'history', label: 'Historial de Reportes', icon: 'calendar_today' },
];