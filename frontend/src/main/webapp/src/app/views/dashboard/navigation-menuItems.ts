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
    name: 'Kundenverwaltung',
    title: true
  },
  {
    name: 'Kunden anlegen',
    url: '/kunden/anlegen',
    icon: 'fa fa-archive',
    permissions: ['CUSTOMER']
  }
];
