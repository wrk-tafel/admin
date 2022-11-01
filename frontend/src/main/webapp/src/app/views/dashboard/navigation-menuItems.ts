import {INavData} from '@coreui/angular';

export interface IPermissionNavData extends INavData {
  permissions?: string[];
}

export const navigationMenuItems: IPermissionNavData[] = [
  {
    name: 'Übersicht',
    url: '/uebersicht',
    icon: 'icon-speedometer',
    permissions: ['DASHBOARD']
  },
  {
    name: 'Kundenverwaltung',
    title: true
  },
  {
    name: 'Kunden suchen',
    url: '/kunden/suchen',
    icon: 'fa fa-search',
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden anlegen',
    url: '/kunden/anlegen',
    icon: 'fa fa-plus',
    permissions: ['CUSTOMER']
  }
];
