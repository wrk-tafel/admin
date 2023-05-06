import {INavData} from '@coreui/angular';

export interface ITafelNavData extends INavData {
  permissions?: string[];
  activeDistributionRequired?: boolean;
}

// TODO permissions can be read via router and therefore save the duplication here
export const navigationMenuItems: ITafelNavData[] = [
  {
    name: 'Übersicht',
    url: '/uebersicht',
    icon: 'fa fa-gauge',
    permissions: ['DASHBOARD']
  },
  {
    name: 'Anmeldung',
    title: true
  },
  {
    name: 'Annahme',
    url: '/anmeldung/annahme',
    icon: 'fa fa-check',
    permissions: ['CHECKIN'],
    activeDistributionRequired: true
  },
  {
    name: 'Scanner',
    url: '/anmeldung/scanner',
    icon: 'fa fa-barcode',
    permissions: ['SCANNER']
  },
  {
    name: 'Ticket-Monitor',
    url: '/anmeldung/ticketmonitor',
    icon: 'fa fa-ticket-simple',
    permissions: ['CHECKIN']
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
