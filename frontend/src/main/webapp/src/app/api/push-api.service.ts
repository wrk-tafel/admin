import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../common/http/suppress-error-toast.token';

export interface PushSubscriptionItem {
  id: number;
  endpoint: string;
  userAgent: string | null;
  label: string | null;
  createdAt: string;
}

export interface PushSubscriptionListResponse {
  items: PushSubscriptionItem[];
}

export interface PushPublicKeyResponse {
  publicKey: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}

export interface PushSubscriptionLabelRequest {
  label: string | null;
}

/**
 * Mirrors the backend's `PushNotificationType`. Which of these a user actually sees is decided
 * server-side by their permissions (`PushNotificationTypeTargeting`) - the preferences response only
 * lists the types they can receive, so this map covers every type but the settings screen renders
 * only the subset that came back.
 */
export enum PushNotificationType {
  DISTRIBUTION_STARTED = 'DISTRIBUTION_STARTED',
  DISTRIBUTION_CLOSED = 'DISTRIBUTION_CLOSED',
  DISTRIBUTION_STILL_OPEN = 'DISTRIBUTION_STILL_OPEN',
  CHECKIN_STARTED = 'CHECKIN_STARTED',
  FOOD_HANDOUT_STARTED = 'FOOD_HANDOUT_STARTED',
  ALL_TICKETS_PROCESSED = 'ALL_TICKETS_PROCESSED',
  FOOD_COLLECTION_COMPLETED = 'FOOD_COLLECTION_COMPLETED',
  USER_LOCKED_OUT = 'USER_LOCKED_OUT',
  REPORT_MAIL_FAILED = 'REPORT_MAIL_FAILED'
}

export const pushNotificationTypeLabel: { [key in PushNotificationType]: string } = {
  [PushNotificationType.DISTRIBUTION_STARTED]: 'Ausgabe gestartet',
  [PushNotificationType.DISTRIBUTION_CLOSED]: 'Ausgabe beendet',
  [PushNotificationType.DISTRIBUTION_STILL_OPEN]: 'Ausgabe noch offen',
  [PushNotificationType.CHECKIN_STARTED]: 'Anmeldung gestartet',
  [PushNotificationType.FOOD_HANDOUT_STARTED]: 'Warenausgabe gestartet',
  [PushNotificationType.ALL_TICKETS_PROCESSED]: 'Alle Kunden abgearbeitet',
  [PushNotificationType.FOOD_COLLECTION_COMPLETED]: 'Warenerfassung abgeschlossen',
  [PushNotificationType.USER_LOCKED_OUT]: 'Benutzer gesperrt',
  [PushNotificationType.REPORT_MAIL_FAILED]: 'E-Mail nicht versendet'
};

/**
 * Shown under each toggle, so the list reads as "what would reach me and when" rather than as a set
 * of labels whose wording has to carry the whole explanation on its own.
 */
export const pushNotificationTypeDescription: { [key in PushNotificationType]: string } = {
  [PushNotificationType.DISTRIBUTION_STARTED]: 'Eine Ausgabe wurde gestartet.',
  [PushNotificationType.DISTRIBUTION_CLOSED]: 'Eine Ausgabe wurde beendet und die Statistiken sind bereit.',
  [PushNotificationType.DISTRIBUTION_STILL_OPEN]: 'Eine Ausgabe wurde an einem früheren Tag gestartet und noch nicht beendet.',
  [PushNotificationType.CHECKIN_STARTED]: 'Der erste Kunde einer Ausgabe wurde angemeldet.',
  [PushNotificationType.FOOD_HANDOUT_STARTED]: 'Das erste Ticket wurde abgearbeitet, die Warenausgabe läuft.',
  [PushNotificationType.ALL_TICKETS_PROCESSED]: 'Alle angemeldeten Kunden einer Ausgabe wurden abgearbeitet.',
  [PushNotificationType.FOOD_COLLECTION_COMPLETED]: 'Für alle aktiven Routen wurden die Waren erfasst.',
  [PushNotificationType.USER_LOCKED_OUT]: 'Ein Benutzer wurde nach zu vielen fehlgeschlagenen Anmeldeversuchen gesperrt.',
  [PushNotificationType.REPORT_MAIL_FAILED]: 'Eine E-Mail konnte auch nach mehreren Versuchen nicht versendet werden.'
};

/**
 * The notification types in the order and grouping the settings screen presents them, which the flat
 * response deliberately doesn't carry: the backend returns them in enum declaration order, which
 * puts a reminder next to a lifecycle event and reads as a jumble.
 *
 * The three groups are the distinctions the domain already makes, and they line up with the
 * permission tiers behind them (everyone / distribution leadership / administrator) - so a user
 * seeing fewer toggles sees whole groups missing rather than an arbitrarily shorter list.
 *
 * Within the first group the order is the order the day actually happens in, which is what makes it
 * readable without further explanation. `push-notification-settings.component.spec.ts` pins that
 * every type appears in exactly one group, so a newly added one can't quietly disappear from the
 * screen by being left out here.
 */
export interface PushNotificationTypeGroup {
  title: string;
  types: PushNotificationType[];
}

export const pushNotificationTypeGroups: PushNotificationTypeGroup[] = [
  {
    title: 'Ablauf der Ausgabe',
    types: [
      PushNotificationType.DISTRIBUTION_STARTED,
      PushNotificationType.CHECKIN_STARTED,
      PushNotificationType.FOOD_COLLECTION_COMPLETED,
      PushNotificationType.FOOD_HANDOUT_STARTED,
      PushNotificationType.ALL_TICKETS_PROCESSED,
      PushNotificationType.DISTRIBUTION_CLOSED
    ]
  },
  {
    title: 'Erinnerungen',
    types: [
      PushNotificationType.DISTRIBUTION_STILL_OPEN
    ]
  },
  {
    title: 'Technisches',
    types: [
      PushNotificationType.REPORT_MAIL_FAILED,
      PushNotificationType.USER_LOCKED_OUT
    ]
  }
];

export enum PushTestResult {
  SENT = 'SENT',
  EXPIRED = 'EXPIRED',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  FAILED = 'FAILED'
}

export interface PushTestResponse {
  result: PushTestResult;
}

export interface PushNotificationTypePreferenceItem {
  type: PushNotificationType;
  enabled: boolean;
}

export interface PushPreferencesResponse {
  masterEnabled: boolean;
  types: PushNotificationTypePreferenceItem[];
}

export interface PushMasterPreferenceRequest {
  enabled: boolean;
}

export interface PushTypePreferenceRequest {
  enabled: boolean;
}

@Service()
export class PushApiService {
  private readonly http = inject(HttpClient);

  getPublicKey(): Observable<PushPublicKeyResponse> {
    return this.http.get<PushPublicKeyResponse>('/push/public-key');
  }

  /**
   * `silent` opts out of the generic error toast, for callers that fetch this in the background
   * rather than because the user asked for it (see `PushNotificationService.syncSubscription`).
   */
  getSubscriptions(silent = false): Observable<PushSubscriptionListResponse> {
    return this.http.get<PushSubscriptionListResponse>('/push/subscriptions', silent ? {context: SUPPRESS_ERROR_TOAST_CONTEXT} : {});
  }

  createSubscription(request: PushSubscriptionRequest, silent = false): Observable<PushSubscriptionItem> {
    return this.http.post<PushSubscriptionItem>('/push/subscriptions', request, silent ? {context: SUPPRESS_ERROR_TOAST_CONTEXT} : {});
  }

  updateLabel(id: number, request: PushSubscriptionLabelRequest): Observable<PushSubscriptionItem> {
    return this.http.put<PushSubscriptionItem>(`/push/subscriptions/${id}/label`, request);
  }

  sendTestNotification(id: number): Observable<PushTestResponse> {
    return this.http.post<PushTestResponse>(`/push/subscriptions/${id}/test`, {});
  }

  deleteSubscription(id: number): Observable<void> {
    return this.http.delete<void>(`/push/subscriptions/${id}`);
  }

  getPreferences(): Observable<PushPreferencesResponse> {
    return this.http.get<PushPreferencesResponse>('/push/preferences');
  }

  updateMasterPreference(request: PushMasterPreferenceRequest): Observable<PushPreferencesResponse> {
    return this.http.put<PushPreferencesResponse>('/push/preferences/master', request);
  }

  updateTypePreference(type: PushNotificationType, request: PushTypePreferenceRequest): Observable<PushPreferencesResponse> {
    return this.http.put<PushPreferencesResponse>(`/push/preferences/types/${type}`, request);
  }
}
