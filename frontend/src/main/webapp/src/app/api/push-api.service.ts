import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

export interface PushSubscriptionItem {
  id: number;
  endpoint: string;
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
}

@Service()
export class PushApiService {
  private readonly http = inject(HttpClient);

  getPublicKey(): Observable<PushPublicKeyResponse> {
    return this.http.get<PushPublicKeyResponse>('/push/public-key');
  }

  getSubscriptions(): Observable<PushSubscriptionListResponse> {
    return this.http.get<PushSubscriptionListResponse>('/push/subscriptions');
  }

  createSubscription(request: PushSubscriptionRequest): Observable<PushSubscriptionItem> {
    return this.http.post<PushSubscriptionItem>('/push/subscriptions', request);
  }

  deleteSubscription(id: number): Observable<void> {
    return this.http.delete<void>(`/push/subscriptions/${id}`);
  }
}
