import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Übersicht',
    url: '/uebersicht',
    icon: 'icon-speedometer'
  },
  {
    name: 'Stammdatenverwaltung',
    title: true
  },
  {
    name: 'Stammdaten',
    url: '/stammdaten',
    icon: 'fa fa-archive'
  }
];
