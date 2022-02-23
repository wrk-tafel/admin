import { INavData } from '@coreui/angular';

export interface IPermissionNavData extends INavData {
  permissions?: string[];
}

export const navigationMenuItems: IPermissionNavData[] = [
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
    icon: 'fa fa-archive',
    permissions: ['CUSTOMER']
  }
];
