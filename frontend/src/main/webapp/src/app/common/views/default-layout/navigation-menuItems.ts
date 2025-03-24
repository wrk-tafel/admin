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
    iconComponent: {name: 'cil-speedometer'}
  },
  {
    name: 'Anmeldung',
    title: true
  },
  {
    name: 'Annahme',
    url: '/anmeldung/annahme',
    iconComponent: {name: 'cil-check-alt'},
    permissions: ['CHECKIN'],
    activeDistributionRequired: true
  },
  {
    name: 'Scanner',
    url: '/anmeldung/scanner',
    iconComponent: {name: 'cil-barcode'},
    permissions: ['SCANNER']
  },
  {
    name: 'Ticket-Monitor',
    url: '/anmeldung/ticketmonitor-steuerung',
    iconComponent: {name: 'cil-screen-desktop'},
    permissions: ['CHECKIN']
  },
  {
    name: 'Kunden',
    title: true
  },
  {
    name: 'Kunden suchen',
    url: '/kunden/suchen',
    iconComponent: {name: 'cil-search'},
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden anlegen',
    url: '/kunden/anlegen',
    iconComponent: {name: 'cil-plus'},
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden-Duplikate',
    url: '/kunden/duplikate',
    iconComponent: {name: 'cil-copy'},
    permissions: ['CUSTOMER_DUPLICATES']
  },
  {
    name: 'Logistik',
    title: true
  },
  {
    name: 'Warenerfassung',
    url: '/logistik/warenerfassung',
    iconComponent: {name: 'cil-bus-alt'},
    permissions: ['LOGISTICS'],
    activeDistributionRequired: true
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
        iconComponent: {name: 'cil-search'}
      },
      {
        name: 'Benutzer anlegen',
        url: '/benutzer/erstellen',
        iconComponent: {name: 'cil-plus'}
      }
    ]
  },
  {
    name: 'Einstellungen',
    iconComponent: {name: 'cil-settings'},
    url: '/einstellungen',
    permissions: ['SETTINGS'],
  },
];
