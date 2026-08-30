import {registerSvgIcons} from '../../util/svg-icon.util';
import speedIcon from '@material-symbols/svg-400/outlined/speed-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import barcodeIcon from '@material-symbols/svg-400/outlined/barcode-fill.svg';
import desktopWindowsIcon from '@material-symbols/svg-400/outlined/desktop_windows-fill.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import boltIcon from '@material-symbols/svg-400/outlined/bolt-fill.svg';
import moreHorizIcon from '@material-symbols/svg-400/outlined/more_horiz-fill.svg';
import contentCopyIcon from '@material-symbols/svg-400/outlined/content_copy-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';
import checklistIcon from '@material-symbols/svg-400/outlined/checklist-fill.svg';
import routeIcon from '@material-symbols/svg-400/outlined/route-fill.svg';
import localShippingIcon from '@material-symbols/svg-400/outlined/local_shipping-fill.svg';
import personIcon from '@material-symbols/svg-400/outlined/person-fill.svg';
import lockPersonIcon from '@material-symbols/svg-400/outlined/lock_person-fill.svg';
import monitoringIcon from '@material-symbols/svg-400/outlined/monitoring-fill.svg';
import historyIcon from '@material-symbols/svg-400/outlined/history-fill.svg';
import settingsIcon from '@material-symbols/svg-400/outlined/settings-fill.svg';
import personSearchIcon from '@material-symbols/svg-400/outlined/person_search-fill.svg';

// Every icon name used anywhere in navigationMenuItems below, registered once from here rather than
// by each consumer (DefaultLayoutComponent's sidebar, QuickOpenDialogComponent's flattened search
// results) - two independent lists silently drifting out of sync is exactly how an icon ends up
// registered for one consumer but not the other.
export function registerNavigationIcons(): void {
  registerSvgIcons({
    speed: speedIcon,
    check: checkIcon,
    barcode: barcodeIcon,
    desktop_windows: desktopWindowsIcon,
    search: searchIcon,
    add: addIcon,
    bolt: boltIcon,
    more_horiz: moreHorizIcon,
    content_copy: contentCopyIcon,
    warning: warningIcon,
    checklist: checklistIcon,
    route: routeIcon,
    local_shipping: localShippingIcon,
    person: personIcon,
    lock_person: lockPersonIcon,
    monitoring: monitoringIcon,
    history: historyIcon,
    settings: settingsIcon,
    person_search: personSearchIcon
  });
}

export interface ITafelNavData {
  name: string;
  url?: string;
  icon?: string;
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
    icon: 'speed'
  },
  {
    name: 'Anmeldung',
    title: true
  },
  {
    name: 'Annahme',
    url: '/anmeldung/annahme',
    icon: 'check',
    permissions: ['CHECKIN'],
    activeDistributionRequired: true
  },
  {
    name: 'Scanner',
    url: '/anmeldung/scanner',
    icon: 'barcode',
    permissions: ['SCANNER']
  },
  {
    name: 'Ticket-Monitor',
    url: '/anmeldung/ticketmonitor-steuerung',
    icon: 'desktop_windows',
    permissions: ['CHECKIN']
  },
  {
    name: 'Kunden',
    title: true
  },
  {
    name: 'Kunden suchen',
    url: '/kunden/suchen',
    icon: 'search',
    permissions: ['CUSTOMER']
  },
  {
    name: 'Kunden anlegen',
    url: '/kunden/anlegen',
    icon: 'add',
    permissions: ['CUSTOMER']
  },
  {
    name: 'Anspruch-Schnellcheck',
    url: '/kunden/schnellcheck',
    icon: 'bolt',
    permissions: ['CUSTOMER']
  },
  {
    name: 'Auswertungen',
    icon: 'more_horiz',
    children: [
      {
        name: 'Kunden-Duplikate',
        url: '/kunden/duplikate',
        icon: 'content_copy',
        permissions: ['CUSTOMER_DUPLICATES']
      },
      {
        name: 'Kunden über Limit',
        url: '/kunden/ueber-limit',
        icon: 'warning',
        permissions: ['CUSTOMERS_ABOVE_LIMIT']
      },
      {
        name: 'Kunden-Übersicht',
        url: '/kunden/uebersicht',
        icon: 'checklist',
        permissions: ['CUSTOMERS_OVERVIEW']
      }
    ]
  },
  {
    name: 'Logistik',
    title: true
  },
  {
    name: 'Routen-Navi',
    url: '/logistik/routen-navi',
    icon: 'route',
    permissions: ['LOGISTICS']
  },
  {
    name: 'Waren-Eingabe',
    url: '/logistik/warenerfassung',
    icon: 'local_shipping',
    permissions: ['LOGISTICS'],
    activeDistributionRequired: true
  },
  {
    name: 'Verwaltung',
    title: true
  },
  {
    name: 'Benutzer',
    url: '/benutzer',
    icon: 'person',
    permissions: ['USER_MANAGEMENT'],
    children: [
      {
        name: 'Benutzer suchen',
        url: '/benutzer/suchen',
        icon: 'search'
      },
      {
        name: 'Benutzer anlegen',
        url: '/benutzer/erstellen',
        icon: 'add'
      },
      {
        name: 'Anmelde-Versuche',
        url: '/benutzer/anmelde-versuche',
        icon: 'lock_person'
      }
    ]
  },
  {
    name: 'Statistiken',
    icon: 'monitoring',
    permissions: ['STATISTICS'],
    children: [
      {
        name: 'Allgemein',
        url: '/statistiken/allgemein'
      },
      {
        name: 'Auswertung Kinder',
        url: '/statistiken/auswertung-kinder'
      }
    ]
  },
  {
    name: 'Zugriffsprotokoll',
    url: '/zugriffsprotokoll',
    icon: 'history',
    permissions: ['AUDIT_LOG']
  },
  {
    name: 'Datenauskunft',
    url: '/datenauskunft',
    icon: 'person_search',
    permissions: ['DATA_SUBJECT_REQUESTS']
  },
  {
    name: 'Einstellungen',
    icon: 'settings',
    url: '/einstellungen',
    permissions: ['SETTINGS'],
    children: [
      {
        name: 'Stammdaten',
        title: true
      },
      {
        name: 'Fahrzeuge',
        url: '/einstellungen/fahrzeuge'
      },
      {
        name: 'Filialen',
        url: '/einstellungen/filialen'
      },
      {
        name: 'Länder',
        url: '/einstellungen/laender'
      },
      {
        name: 'Notschlafstellen',
        url: '/einstellungen/notschlafstellen'
      },
      {
        name: 'Routen',
        url: '/einstellungen/routen'
      },
      {
        name: 'Waren-Kategorien',
        url: '/einstellungen/lebensmittelkategorien'
      },
      {
        name: 'Retour-Kategorien',
        url: '/einstellungen/retourkategorien'
      },
      {
        name: 'Systemverwaltung',
        title: true
      },
      {
        name: 'E-Mail',
        url: '/einstellungen/email'
      },
      {
        name: 'Grenzwerte',
        url: '/einstellungen/statische-werte'
      },
      {
        name: 'Mitarbeiter',
        url: '/einstellungen/mitarbeiter'
      },
    ],
  },
];
