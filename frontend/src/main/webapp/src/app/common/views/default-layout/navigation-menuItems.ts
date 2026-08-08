import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {
  faBarcode,
  faChartLine,
  faCheck,
  faCopy,
  faDesktop,
  faEllipsis,
  faGaugeHigh,
  faGear,
  faListCheck,
  faMagnifyingGlass,
  faPlus,
  faTriangleExclamation,
  faTruck,
  faUser,
  faUserLock
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
    name: 'Sonstige',
    icon: faEllipsis,
    children: [
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
        name: 'Kunden-Übersicht',
        url: '/kunden/uebersicht',
        icon: faListCheck,
        permissions: ['CUSTOMERS_OVERVIEW']
      }
    ]
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
      },
      {
        name: 'Anmelde-Versuche',
        url: '/benutzer/anmelde-versuche',
        icon: faUserLock
      }
    ]
  },
  {
    name: 'Statistiken',
    icon: faChartLine,
    permissions: ['STATISTICS'],
    children: [
      {
        name: 'Allgemein',
        url: '/statistiken/allgemein'
      },
      {
        name: 'Schulstartpakete',
        url: '/statistiken/schulstartpakete'
      }
    ]
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
        name: 'Fahrzeuge',
        url: '/einstellungen/fahrzeuge'
      },
      {
        name: 'Grenzwerte',
        url: '/einstellungen/statische-werte'
      },
      {
        name: 'Mitarbeiter',
        url: '/einstellungen/mitarbeiter'
      },
      {
        name: 'Notschlafstellen',
        url: '/einstellungen/notschlafstellen'
      },
      {
        name: 'Waren-Kategorien',
        url: '/einstellungen/lebensmittelkategorien'
      },
      {
        name: 'Retour-Kategorien',
        url: '/einstellungen/retourkategorien'
      },
    ],
  },
];
