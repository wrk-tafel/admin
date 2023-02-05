import {INavData} from '@coreui/angular';

export interface IPermissionNavData extends INavData {
  permissions?: string[];
}

// TODO permissions can be read via router and therefore save the duplication here
export const navigationMenuItems: IPermissionNavData[] = [
  {
    name: 'Übersicht',
    url: '/uebersicht',
    icon: 'icon-speedometer',
    permissions: ['DASHBOARD']
  },
  {
    name: 'Anmeldung',
    title: true
  },
  {
    name: 'Scanner',
    url: '/anmeldung/scanner',
    icon: 'fa fa-barcode',
    permissions: ['SCANNER']
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
