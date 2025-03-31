import {inject, Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class SSEService {
  private readonly urlHelperService = inject(UrlHelperService);

  constructor(private zone: NgZone) {
  }

  listen<T>(url: string): Observable<T> {
    return new Observable<T>((observer) => {
      const baseUrl = this.urlHelperService.getBaseUrl()
      const eventSource = new EventSource(`${baseUrl}/api${url}`);

      eventSource.onmessage = (event) => {
        // Ensure updates run inside Angular zone
        this.zone.run(() => {
          observer.next(JSON.parse(event.data) as T);
        });
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        observer.error(error);
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
