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