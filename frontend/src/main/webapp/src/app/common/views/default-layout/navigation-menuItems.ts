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
    icon: 'fa fa-gauge'
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
    url: '/anmeldung/ticketmonitor-steuerung',
    icon: 'fa fa-ticket-simple',
    permissions: ['CHECKIN']
  },
  {
    name: 'Kunden',
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
  },
  {
    name: 'Sonstige',
    title: true
  },
  {
    name: 'Benutzer',
    iconComponent: {name: 'cil-user'},
    permissions: ['USER_MANAGEMENT'],
    children: [
      {
        name: 'Benutzer suchen',
        url: '/benutzer/suchen',
        icon: 'fa fa-search'
      },
      {
        name: 'Benutzer anlegen',
        url: '/benutzer/erstellen',
        icon: 'fa fa-plus'
      }
    ]
  }
];
