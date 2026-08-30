import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';
import {genderLabel} from './customer-api.service';
import {documentTypeLabel} from './customer-document-api.service';

/**
 * Reads the audit trail ("Zugriffsprotokoll"). There is deliberately no write method - entries
 * appear as a side effect of the changes they describe and are removed only by the backend's
 * retention job.
 */
@Service()
export class AuditApiService {
  private http = inject(HttpClient);

  searchAuditEntries(filter: AuditSearchFilter = {}, page?: number, pageSize?: number): Observable<AuditEntriesResponse> {
    let queryParams = new HttpParams();
    if (filter.entityType) {
      queryParams = queryParams.set('entityType', filter.entityType);
    }
    if (filter.operation) {
      queryParams = queryParams.set('operation', filter.operation);
    }
    if (filter.actorUsername) {
      queryParams = queryParams.set('actorUsername', filter.actorUsername);
    }
    if (filter.businessKey) {
      queryParams = queryParams.set('businessKey', filter.businessKey);
    }
    if (filter.from) {
      queryParams = queryParams.set('from', filter.from);
    }
    if (filter.to) {
      queryParams = queryParams.set('to', filter.to);
    }
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<AuditEntriesResponse>('/audit', {params: queryParams});
  }

  getFilterOptions(): Observable<AuditFilterOptionsResponse> {
    return this.http.get<AuditFilterOptionsResponse>('/audit/filter-options');
  }

  getHistoryForCustomer(customerId: number, page?: number, pageSize?: number): Observable<AuditEntriesResponse> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<AuditEntriesResponse>(`/audit/households/${customerId}`, {params: queryParams});
  }
}

export type AuditEntriesResponse = PagedResponse<AuditEntryItem>;

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'READ';

export interface AuditSearchFilter {
  entityType?: string | null;
  operation?: AuditOperation | null;
  actorUsername?: string | null;
  businessKey?: string | null;
  /** `yyyy-MM-dd`, taken verbatim from a native date input - never a `Date`, whose UTC conversion can move the selected day. */
  from?: string | null;
  to?: string | null;
}

export interface AuditEntryItem {
  id: number;
  occurredAt: Date;
  actorUsername?: string;
  /** The acting user's employee name, stamped alongside the username - absent on older entries and on entries no user is behind. */
  actorFirstname?: string;
  actorLastname?: string;
  entityType: string;
  entityId?: number;
  businessKey?: string;
  operation: AuditOperation;
  changes: AuditFieldChangeItem[];
}

export interface AuditFieldChangeItem {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface AuditFilterOptionsResponse {
  entityTypes: string[];
  operations: AuditOperation[];
  /**
   * The users the log actually holds entries for - the actor filter matches a username exactly,
   * so it offers them rather than asking for one to be typed.
   */
  actors: AuditActorItem[];
}

export interface AuditActorItem {
  username: string;
  firstname?: string;
  lastname?: string;
}

/** German labels for what the backend stores as stable, English entity/operation keys. */
export const auditEntityTypeLabel: Record<string, string> = {
  Household: 'Kunde',
  Person: 'Person',
  HouseholdNote: 'Notiz',
  Document: 'Dokument',
  User: 'Benutzer',
  UserAuthority: 'Berechtigung',
  StaticValue: 'Grenzwert',
  MailRecipient: 'E-Mail-Empfänger',
  UserLogin: 'Login',
  ScannerFile: 'Scanner-Datei',
  DistributionHouseholdList: 'Kundenliste (Ausgabe)',
  Employee: 'Mitarbeiter'
};

export const auditOperationLabel: Record<AuditOperation, string> = {
  INSERT: 'Angelegt',
  UPDATE: 'Geändert',
  DELETE: 'Gelöscht',
  LOGIN: 'Angemeldet',
  READ: 'Abgerufen'
};

/**
 * German labels for the entity fields that show up in a diff. A field with no entry here is shown
 * under its technical name rather than hidden - a missing translation must not hide a change.
 */
export const auditFieldLabel: Record<string, string> = {
  addressCity: 'Ort',
  address: 'E-Mail-Adresse',
  addressDoor: 'Tür',
  addressHouseNumber: 'Hausnummer',
  addressPostalCode: 'PLZ',
  addressStairway: 'Stiege',
  addressStreet: 'Straße',
  age: 'Alter',
  amount: 'Betrag',
  birthDate: 'Geburtsdatum',
  contentType: 'Dateityp',
  country: 'Nationalität',
  countAdults: 'Anzahl Erwachsene',
  countChildren: 'Anzahl Kinder',
  documentType: 'Dokumentart',
  email: 'E-Mail',
  employee: 'Mitarbeiter',
  employer: 'Arbeitgeber',
  enabled: 'Aktiv',
  excludeFromHousehold: 'Nicht im selben Haushalt',
  fileName: 'Dateiname',
  firstname: 'Vorname',
  gender: 'Geschlecht',
  household: 'Kunde',
  householdId: 'Kundennummer',
  income: 'Einkommen',
  incomeDue: 'Einkommen nachgewiesen bis',
  isMainPerson: 'Hauptbezieher',
  issuer: 'Angelegt von',
  lastLogin: 'Letzte Anmeldung',
  lastname: 'Nachname',
  lockReason: 'Sperrgrund',
  locked: 'Gesperrt',
  lockedAt: 'Gesperrt am',
  lockedBy: 'Gesperrt von',
  mailType: 'Mailtyp',
  mainPerson: 'Hauptbezieher',
  mergedFromHouseholds: 'Zusammengeführt aus',
  mergedIntoHousehold: 'Zusammengeführt in',
  movedDistributions: 'Verschobene Ausgaben',
  movedDocuments: 'Verschobene Dokumente',
  movedNotes: 'Verschobene Notizen',
  movedPersons: 'Verschobene Personen',
  name: 'Berechtigung',
  note: 'Notiz',
  passwordChangeRequired: 'Passwortänderung erforderlich',
  password: 'Passwort',
  pendingCostContribution: 'Offener Unkostenbeitrag',
  person: 'Person',
  personnelNumber: 'Personalnummer',
  prolongedAt: 'Verlängert am',
  receivesFamilyAllowance: 'Bezieht Familienbeihilfe',
  recipientType: 'Empfängertyp',
  retentionPeriodAtUpload: 'Aufbewahrungsfrist bei Upload',
  singleParent: 'Alleinerzieher',
  storagePath: 'Speicherpfad',
  telephoneNumber: 'Telefon',
  tokenInvalidatedAt: 'Sitzung ungültig seit',
  type: 'Art',
  uploadedByUser: 'Hochgeladen von',
  user: 'Benutzer',
  username: 'Benutzername',
  validFrom: 'Gültig von',
  validTo: 'Gültig bis',
  validUntil: 'Gültig bis'
};

/**
 * German labels for known field *values* - booleans as Ja/Nein, and the fixed enum sets stored for
 * gender, document type, static-value type, mail type, recipient type and permission name. Keyed by
 * field name, since the same raw value ("true", "TO", ...) means something different depending on
 * which field it belongs to. A value with no entry here is shown as stored - same "missing
 * translation must not hide a change" reasoning as [auditFieldLabel].
 */
const BOOLEAN_VALUE_LABEL: Record<string, string> = {
  true: 'Ja',
  false: 'Nein'
};

const BOOLEAN_FIELDS = [
  'enabled',
  'excludeFromHousehold',
  'isMainPerson',
  'locked',
  'passwordChangeRequired',
  'receivesFamilyAllowance',
  'singleParent'
];

export const auditValueLabel: Record<string, Record<string, string>> = {
  ...Object.fromEntries(BOOLEAN_FIELDS.map(field => [field, BOOLEAN_VALUE_LABEL])),
  gender: genderLabel,
  documentType: documentTypeLabel,
  // StaticValueEntity.type - the labels used on the static-values settings screen
  // (modules/settings/views/static-values/static-value-types.ts).
  type: {
    INCOME_LIMIT: 'Einkommensgrenze',
    ADDITIONAL_ADULT: 'Zusätzlicher Erwachsener',
    ADDITIONAL_CHILD: 'Zusätzliches Kind',
    TOLERANCE: 'Toleranz',
    FAMILY_ALLOWANCE: 'Familienbeihilfe',
    CHILD_TAX_ALLOWANCE: 'Kinderabsetzbetrag',
    SIBLING_ADDITION: 'Geschwisterstaffel',
    COST_CONTRIBUTION: 'Unkostenbeitrag'
  },
  // MailRecipientEntity.mailType/recipientType - the labels used on the mail-recipients settings
  // screen (modules/settings/components/mail-recipients/mail-recipients.component.ts).
  mailType: {
    DAILY_REPORT: 'Tagesreport',
    STATISTICS: 'Statistiken',
    RETURN_BOXES: 'Retourkisten'
  },
  recipientType: {
    TO: 'Empfänger (AN)',
    CC: 'Kopie (CC)',
    BCC: 'Blindkopie (BCC)'
  },
  // UserAuthorityEntity.name - the permission key, labelled the same way UserPermissions.title
  // labels it on the backend (common/auth/model/UserPermissions.kt).
  name: {
    AUDIT_LOG: 'Zugriffsprotokoll',
    CHECKIN: 'Anmeldung',
    DISTRIBUTION_LCM: 'Ausgabe-Ablauf',
    USER_MANAGEMENT: 'Benutzerverwaltung',
    CUSTOMER: 'Kundenverwaltung',
    CUSTOMER_DOCUMENTS: 'Kunden-Dokumente',
    CUSTOMER_DUPLICATES: 'Kunden-Duplikate',
    CUSTOMERS_ABOVE_LIMIT: 'Kunden über dem Limit',
    CUSTOMERS_OVERVIEW: 'Kunden-Übersicht (Neu & Verlängert)',
    DATA_SUBJECT_REQUESTS: 'Datenauskunft',
    LOGISTICS: 'Transport/Logistik',
    SCANNER: 'Scanner',
    SETTINGS: 'Einstellungen',
    STATISTICS: 'Statistiken',
    SUPERVISOR: 'Supervisor',
    ADMINISTRATOR: 'Administrator'
  }
};
