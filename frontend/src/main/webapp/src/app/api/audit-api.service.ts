import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

/**
 * Reads the audit trail ("Änderungsprotokoll"). There is deliberately no write method - entries
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

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';

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
  UserLogin: 'Login'
};

export const auditOperationLabel: Record<AuditOperation, string> = {
  INSERT: 'Angelegt',
  UPDATE: 'Geändert',
  DELETE: 'Gelöscht',
  LOGIN: 'Angemeldet'
};

/**
 * German labels for the entity fields that show up in a diff. A field with no entry here is shown
 * under its technical name rather than hidden - a missing translation must not hide a change.
 */
export const auditFieldLabel: Record<string, string> = {
  addressCity: 'Ort',
  addressDoor: 'Tür',
  addressHouseNumber: 'Hausnummer',
  addressPostalCode: 'PLZ',
  addressStairway: 'Stiege',
  addressStreet: 'Straße',
  birthDate: 'Geburtsdatum',
  contentType: 'Dateityp',
  country: 'Nationalität',
  documentType: 'Dokumentart',
  email: 'E-Mail',
  employer: 'Arbeitgeber',
  enabled: 'Aktiv',
  excludeFromHousehold: 'Nicht im Haushalt',
  fileName: 'Dateiname',
  firstname: 'Vorname',
  gender: 'Geschlecht',
  household: 'Kunde',
  income: 'Einkommen',
  incomeDue: 'Einkommen nachgewiesen bis',
  isMainPerson: 'Hauptbezieher',
  lastname: 'Nachname',
  lockReason: 'Sperrgrund',
  locked: 'Gesperrt',
  lockedAt: 'Gesperrt am',
  lockedBy: 'Gesperrt von',
  mainPerson: 'Hauptbezieher',
  mergedFromHouseholds: 'Zusammengeführt aus',
  mergedIntoHousehold: 'Zusammengeführt in',
  movedDistributions: 'Verschobene Ausgaben',
  movedDocuments: 'Verschobene Dokumente',
  movedNotes: 'Verschobene Notizen',
  movedPersons: 'Verschobene Personen',
  note: 'Notiz',
  passwordChangeRequired: 'Passwortänderung erforderlich',
  password: 'Passwort',
  pendingCostContribution: 'Offener Unkostenbeitrag',
  prolongedAt: 'Verlängert am',
  receivesFamilyAllowance: 'Bezieht Familienbeihilfe',
  singleParent: 'Alleinerzieher',
  telephoneNumber: 'Telefon',
  username: 'Benutzername',
  validUntil: 'Gültig bis'
};
