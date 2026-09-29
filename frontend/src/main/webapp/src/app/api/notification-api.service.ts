import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../common/http/suppress-error-toast.token';

export type NotificationKind = 'NOTIFICATION' | 'ANNOUNCEMENT';

export interface NotificationItem {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Path below the app's base path, e.g. `uebersicht`; `null` when the entry leads nowhere. */
  targetPath: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export interface AnnouncementRequest {
  title: string;
  message: string;
  /** ISO datetime, `null` for a message that stays until it is deleted. */
  expiresAt: string | null;
}

export interface AnnouncementResponse {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  expiresAt: string | null;
  /** `false` once `expiresAt` has passed - the message is no longer shown in anybody's bell. */
  active: boolean;
}

export interface AnnouncementListResponse {
  items: AnnouncementResponse[];
}

/**
 * The bell in the header (`/notifications`, every logged-in user) and the administrators' screen
 * for the messages that reach it (`/announcements`). The bell polls in the background, so a failed
 * poll must not raise an error toast.
 */
@Service()
export class NotificationApiService {
  private readonly http = inject(HttpClient);

  getNotifications(): Observable<NotificationListResponse> {
    return this.http.get<NotificationListResponse>('/notifications', {context: SUPPRESS_ERROR_TOAST_CONTEXT});
  }

  markRead(kind: NotificationKind, id: number): Observable<void> {
    return this.http.post<void>(`/notifications/${kind}/${id}/read`, null, {context: SUPPRESS_ERROR_TOAST_CONTEXT});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>('/notifications/read-all', null, {context: SUPPRESS_ERROR_TOAST_CONTEXT});
  }

  getAnnouncements(): Observable<AnnouncementListResponse> {
    return this.http.get<AnnouncementListResponse>('/announcements');
  }

  createAnnouncement(request: AnnouncementRequest): Observable<AnnouncementResponse> {
    return this.http.post<AnnouncementResponse>('/announcements', request);
  }

  updateAnnouncement(id: number, request: AnnouncementRequest): Observable<AnnouncementResponse> {
    return this.http.put<AnnouncementResponse>(`/announcements/${id}`, request);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(`/announcements/${id}`);
  }
}
