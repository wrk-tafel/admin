import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {
  faBarcode,
  faChartLine,
  faCheck,
  faCopy,
  faDesktop,
  faGaugeHigh,
  faGear,
  faMagnifyingGlass,
  faPlus,
  faTriangleExclamation,
  faTruck,
  faUser
} from '@fortawesome/free-solid-svg-icons';

export interface ITafelNavData {
  name: string;
  url?: string;
  icon?: IconDefinition;
  permissions?: string[];
  activeDistributionRequired?: boolean;
  title?: boolean;
  badge?: { text: string; color: string };
  attributes?: { disabled?: boolean };
  children?: ITafelNavData[];
}

export const navigationMenuItems: ITafelNavData[] = [
  {
    name: 'Übersicht',
    url: '/uebersicht',
    icon: faGaugeHigh
  },
  {
    name: 'Anmeldung',
    title: true
  },
  {
    name: 'Annahme',
    url: '/anmeldung/annahme',
    icon: faCheck,
    permissions: ['CHECKIN'],
    activeDistributionRequired: true
  },
  {
    name: 'Scanner',
    url: '/anmeldung/scanner',
    icon: faBarcode,
    permissions: ['SCANNER']
  },
  {
    name: 'Ticket-Monitor',
    url: '/anmeldung/ticketmonitor-steuerung',
    icon: faDesktop,
    permissions: ['CHECKIN']
  },
  {
    name: 'Kunden',
    title: true
  },
  {
    name: 'Kunden suchen',
    url: '/kunden/suchen',
    icon: faMagnifyingGlass,
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden anlegen',
    url: '/kunden/anlegen',
    icon: faPlus,
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden-Duplikate',
    url: '/kunden/duplikate',
    icon: faCopy,
    permissions: ['CUSTOMER_DUPLICATES']
  },
  {
    name: 'Kunden über Limit',
    url: '/kunden/ueber-limit',
    icon: faTriangleExclamation,
    permissions: ['CUSTOMERS_ABOVE_LIMIT']
  },
  {
    name: 'Logistik',
    title: true
  },
  {
    name: 'Waren-Eingabe',
    url: '/logistik/warenerfassung',
    icon: faTruck,
    permissions: ['LOGISTICS'],
    activeDistributionRequired: true
  },
  {
    name: 'Sonstige',
    title: true
  },
  {
    name: 'Benutzer',
    url: '/benutzer',
    icon: faUser,
    permissions: ['USER_MANAGEMENT'],
    children: [
      {
        name: 'Benutzer suchen',
        url: '/benutzer/suchen',
        icon: faMagnifyingGlass
      },
      {
        name: 'Benutzer anlegen',
        url: '/benutzer/erstellen',
        icon: faPlus
      }
    ]
  },
  {
    name: 'Statistiken',
    icon: faChartLine,
    url: '/statistiken',
    permissions: ['STATISTICS'],
  },
  {
    name: 'Einstellungen',
    icon: faGear,
    url: '/einstellungen',
    permissions: ['SETTINGS'],
    children: [
      {
        name: 'E-Mail',
        url: '/einstellungen/email'
      },
      {
        name: 'Notschlafstellen',
        url: '/einstellungen/notschlafstellen'
      },
      {
        name: 'Statische Werte',
        url: '/einstellungen/statische-werte'
      },
      {
        name: 'Lebensmittelkategorien',
        url: '/einstellungen/lebensmittelkategorien'
      },
    ],
  },
];
