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
import inventory2Icon from '@material-symbols/svg-400/outlined/inventory_2-fill.svg';
import personIcon from '@material-symbols/svg-400/outlined/person-fill.svg';
import lockIcon from '@material-symbols/svg-400/outlined/lock-fill.svg';
import lockPersonIcon from '@material-symbols/svg-400/outlined/lock_person-fill.svg';
import monitoringIcon from '@material-symbols/svg-400/outlined/monitoring-fill.svg';
import historyIcon from '@material-symbols/svg-400/outlined/history-fill.svg';
import settingsIcon from '@material-symbols/svg-400/outlined/settings-fill.svg';
import personSearchIcon from '@material-symbols/svg-400/outlined/person_search-fill.svg';
import storeIcon from '@material-symbols/svg-400/outlined/store-fill.svg';
import badgeIcon from '@material-symbols/svg-400/outlined/badge-fill.svg';
import categoryIcon from '@material-symbols/svg-400/outlined/category-fill.svg';
import assignmentReturnIcon from '@material-symbols/svg-400/outlined/assignment_return-fill.svg';
import straightenIcon from '@material-symbols/svg-400/outlined/straighten-fill.svg';
import publicIcon from '@material-symbols/svg-400/outlined/public-fill.svg';
import bedIcon from '@material-symbols/svg-400/outlined/bed-fill.svg';
import campaignIcon from '@material-symbols/svg-400/outlined/campaign-fill.svg';
import deleteHistoryIcon from '@material-symbols/svg-400/outlined/delete_history-fill.svg';
import mailIcon from '@material-symbols/svg-400/outlined/mail-fill.svg';
import arrowBackIcon from '@material-symbols/svg-400/outlined/arrow_back-fill.svg';
import privacyTipIcon from '@material-symbols/svg-400/outlined/privacy_tip-fill.svg';
import passwordIcon from '@material-symbols/svg-400/outlined/password-fill.svg';
import shieldLockIcon from '@material-symbols/svg-400/outlined/shield_lock-fill.svg';
import devicesIcon from '@material-symbols/svg-400/outlined/devices-fill.svg';
import notificationsIcon from '@material-symbols/svg-400/outlined/notifications-fill.svg';
import paletteIcon from '@material-symbols/svg-400/outlined/palette-fill.svg';

// Every icon name used anywhere in the menus below, registered once from here rather than
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
    inventory_2: inventory2Icon,
    person: personIcon,
    lock: lockIcon,
    lock_person: lockPersonIcon,
    monitoring: monitoringIcon,
    history: historyIcon,
    settings: settingsIcon,
    person_search: personSearchIcon,
    store: storeIcon,
    badge: badgeIcon,
    category: categoryIcon,
    assignment_return: assignmentReturnIcon,
    straighten: straightenIcon,
    public: publicIcon,
    bed: bedIcon,
    campaign: campaignIcon,
    delete_history: deleteHistoryIcon,
    mail: mailIcon,
    arrow_back: arrowBackIcon,
    privacy_tip: privacyTipIcon,
    password: passwordIcon,
    shield_lock: shieldLockIcon,
    devices: devicesIcon,
    notifications: notificationsIcon,
    palette: paletteIcon
  });
}

export interface ITafelNavData {
  name: string;
  url?: string;
  icon?: string;
  permissions?: string[];
  activeDistributionRequired?: boolean;
  title?: boolean;
  /** Short explanation shown on the entry's card in an overview page. */
  description?: string;
  /**
   * The entry is a plain link in the sidebar; its children are listed on the page it links to (and
   * still reachable from the quick-open palette) instead of expanding below it.
   */
  linkOnly?: boolean;
  badge?: { text: string; color: string };
  attributes?: { disabled?: boolean };
  children?: ITafelNavData[];
  /** The entry's `testid` in the sidebar. */
  testId?: string;
  /** The entry is shown as the open page only on its own address, not on the pages below it (an area's overview). */
  exact?: boolean;
}

/** "Mein Konto" and its topics. */
export const ACCOUNT_PATH = '/konto';

/** The settings: their overview page and every settings screen below it. */
export const SETTINGS_PATH = '/einstellungen';

/**
 * The account's topics in three groups. Every entry is the address of a child route of `account.routes.ts`. None needs a
 * permission: every user has an account.
 */
export const accountMenuItems: ITafelNavData[] = [
  {name: 'Profil', title: true},
  {name: 'Meine Daten', url: '/konto/daten', icon: 'person', testId: 'account-nav-data'},
  {name: 'Datenschutz', url: '/konto/datenschutz', icon: 'privacy_tip', testId: 'account-nav-privacy'},
  {name: 'Sicherheit', title: true},
  {name: 'Passwort', url: '/konto/passwort', icon: 'password', testId: 'account-nav-password'},
  {name: 'Zwei-Faktor-Authentifizierung', url: '/konto/zwei-faktor', icon: 'shield_lock', testId: 'account-nav-mfa'},
  {name: 'Sitzungen', url: '/konto/sitzungen', icon: 'devices', testId: 'account-nav-sessions'},
  {name: 'Einstellungen', title: true},
  {name: 'Benachrichtigungen', url: '/konto/benachrichtigungen', icon: 'notifications', testId: 'account-nav-notifications'},
  {name: 'Design', url: '/konto/design', icon: 'palette', testId: 'account-nav-theme'}
];

/**
 * Every settings screen, under the topic it belongs to: the children of the main menu's single "Einstellungen" link, the
 * cards of the overview page (`SettingsOverviewComponent`), the palette's "Einstellungen › ..." entries and the settings
 * area's sidebar (`sidebarAreas`) all read this one list. Each entry needs the main menu's `SETTINGS` on top of its own
 * permissions.
 */
export const settingsMenuItems: ITafelNavData[] = [
  {
    name: 'Logistik',
    title: true
  },
  {
    name: 'Fahrzeuge',
    url: '/einstellungen/fahrzeuge',
    icon: 'local_shipping',
    description: 'Fahrzeuge für Warenabholungen verwalten'
  },
  {
    name: 'Filialen',
    url: '/einstellungen/filialen',
    icon: 'store',
    description: 'Filialen und Ansprechpersonen der Warenspender'
  },
  {
    name: 'Mitarbeiter',
    url: '/einstellungen/mitarbeiter',
    icon: 'badge',
    description: 'Fahrer und Beifahrer der Warenabholungen'
  },
  {
    name: 'Routen',
    url: '/einstellungen/routen',
    icon: 'route',
    description: 'Abholrouten mit ihren Filialen'
  },
  {
    name: 'Waren-Kategorien',
    url: '/einstellungen/lebensmittelkategorien',
    icon: 'category',
    description: 'Kategorien der erfassten Waren'
  },
  {
    name: 'Retour-Kategorien',
    url: '/einstellungen/retourkategorien',
    icon: 'assignment_return',
    description: 'Kategorien der retournierten Waren'
  },
  {
    name: 'Kunden & Betreuung',
    title: true
  },
  {
    name: 'Grenzwerte',
    url: '/einstellungen/statische-werte',
    icon: 'straighten',
    description: 'Einkommensgrenzen und weitere statische Werte'
  },
  {
    name: 'Länder',
    url: '/einstellungen/laender',
    icon: 'public',
    description: 'Länder zur Auswahl der Staatsangehörigkeit'
  },
  {
    name: 'Notschlafstellen',
    url: '/einstellungen/notschlafstellen',
    icon: 'bed',
    description: 'Notschlafstellen und ihre Personenzahl'
  },
  {
    name: 'System',
    title: true
  },
  {
    name: 'Ankündigungen',
    url: '/einstellungen/ankuendigungen',
    icon: 'campaign',
    description: 'Nachrichten an alle Benutzer veröffentlichen',
    permissions: ['ADMINISTRATOR']
  },
  {
    name: 'Anstehende Löschungen',
    url: '/einstellungen/anstehende-loeschungen',
    icon: 'delete_history',
    description: 'Was die automatische Datenlöschung bald entfernt',
    permissions: ['ADMINISTRATOR']
  },
  {
    name: 'E-Mail',
    url: '/einstellungen/email',
    icon: 'mail',
    description: 'Empfänger automatischer E-Mails und erneuter Versand'
  }
];

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
        name: 'Neu & Verlängert',
        url: '/kunden/uebersicht',
        icon: 'checklist',
        permissions: ['CUSTOMERS_OVERVIEW']
      },
      {
        name: 'Duplikate',
        url: '/kunden/duplikate',
        icon: 'content_copy',
        permissions: ['CUSTOMER_DUPLICATES']
      },
      {
        name: 'Über Limit',
        url: '/kunden/ueber-limit',
        icon: 'warning',
        permissions: ['CUSTOMERS_ABOVE_LIMIT']
      },
      {
        name: 'Gesperrt',
        url: '/kunden/gesperrt',
        icon: 'lock',
        permissions: ['CUSTOMER']
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
    name: 'Retourkisten',
    url: '/logistik/retourkisten',
    icon: 'inventory_2',
    permissions: ['LOGISTICS']
  },
  {
    name: 'Routenerfassung',
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
    linkOnly: true,
    children: settingsMenuItems
  }
];

/**
 * A part of the application whose pages the sidebar lists in place of the main menu while one of them is open: the
 * area's pages in their groups, with the way back to the application at the top, so the area has one navigation and its
 * page the full width. Every page keeps its own address; the area only decides what the sidebar shows.
 */
export interface SidebarArea {
  /** The area's own address; it is open on this address and every one below it. */
  path: string;
  /** The navigation landmark's name for a screen reader. */
  label: string;
  /** The `nav`'s `testid`; each entry's is this plus a suffix. */
  testId: string;
  /** What the sidebar shows, filtered by permission like the main menu. */
  items: ITafelNavData[];
}

function backToApplication(testId: string): ITafelNavData {
  return {name: 'Zurück zur Anwendung', url: '/uebersicht', icon: 'arrow_back', testId};
}

/** A settings screen's `testid` in the area's sidebar: the last segment of its address, e.g. `settings-nav-fahrzeuge`. */
function withSettingsTestId(item: ITafelNavData): ITafelNavData {
  return item.url ? {...item, testId: `settings-nav-${item.url.split('/').pop()}`} : item;
}

const settingsMenu = navigationMenuItems.find(item => item.url === SETTINGS_PATH)!;

export const sidebarAreas: SidebarArea[] = [
  {
    path: ACCOUNT_PATH,
    label: 'Mein Konto',
    testId: 'account-nav',
    items: [backToApplication('account-nav-back'), ...accountMenuItems]
  },
  {
    path: SETTINGS_PATH,
    label: 'Einstellungen',
    testId: 'settings-nav',
    // The main menu's permission goes on every entry here, as it does for the entries below it there.
    items: [
      backToApplication('settings-nav-back'),
      {
        name: 'Übersicht',
        url: SETTINGS_PATH,
        icon: 'settings',
        exact: true,
        testId: 'settings-nav-overview',
        permissions: settingsMenu.permissions
      },
      ...settingsMenuItems.map(item => item.title ? item : withSettingsTestId({
        ...item,
        permissions: [...(settingsMenu.permissions ?? []), ...(item.permissions ?? [])]
      }))
    ]
  }
];

/** The area the address belongs to, or `undefined` for one the main menu serves. Query and fragment do not count. */
export function sidebarAreaOf(url: string): SidebarArea | undefined {
  const path = url.split(/[?#]/)[0];
  return sidebarAreas.find(area => path === area.path || path.startsWith(area.path + '/'));
}
