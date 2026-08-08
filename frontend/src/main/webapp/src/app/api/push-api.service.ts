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
  FOOD_COLLECTION_INCOMPLETE = 'FOOD_COLLECTION_INCOMPLETE',
  USER_LOCKED_OUT = 'USER_LOCKED_OUT',
  REPORT_MAIL_FAILED = 'REPORT_MAIL_FAILED'
}

export const pushNotificationTypeLabel: { [key in PushNotificationType]: string } = {
  [PushNotificationType.DISTRIBUTION_STARTED]: 'Ausgabe gestartet',
  [PushNotificationType.DISTRIBUTION_CLOSED]: 'Ausgabe beendet',
  [PushNotificationType.DISTRIBUTION_STILL_OPEN]: 'Ausgabe noch offen',
  [PushNotificationType.FOOD_COLLECTION_INCOMPLETE]: 'Warenerfassung unvollständig',
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
  [PushNotificationType.FOOD_COLLECTION_INCOMPLETE]:
    'Eine Ausgabe wurde beendet, obwohl noch nicht für alle Routen die Waren erfasst wurden.',
  [PushNotificationType.USER_LOCKED_OUT]: 'Ein Benutzer wurde nach zu vielen fehlgeschlagenen Anmeldeversuchen gesperrt.',
  [PushNotificationType.REPORT_MAIL_FAILED]: 'Eine Report-E-Mail konnte nach einer Ausgabe nicht versendet werden.'
};

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
