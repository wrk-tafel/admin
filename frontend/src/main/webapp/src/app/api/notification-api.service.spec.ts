import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SUPPRESS_ERROR_TOAST} from '../common/http/suppress-error-toast.token';
import {NotificationApiService, NotificationListResponse} from './notification-api.service';

describe('NotificationApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: NotificationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(NotificationApiService);
  });

  afterEach(() => httpMock.verify());

  it('gets the notifications without an error toast', () => {
    const testData: NotificationListResponse = {items: [], unreadCount: 0};
    let response: NotificationListResponse | undefined;

    apiService.getNotifications().subscribe(data => response = data);

    const req = httpMock.expectOne('/notifications');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush(testData);
    expect(response).toEqual(testData);
  });

  it('marks one entry read by kind and id', () => {
    apiService.markRead('ANNOUNCEMENT', 4).subscribe();

    const req = httpMock.expectOne('/notifications/ANNOUNCEMENT/4/read');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('marks all entries read', () => {
    apiService.markAllRead().subscribe();

    const req = httpMock.expectOne('/notifications/read-all');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('creates, updates and deletes an announcement', () => {
    const request = {title: 'T', message: 'M', expiresAt: null};

    apiService.createAnnouncement(request).subscribe();
    const create = httpMock.expectOne('/announcements');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(request);
    create.flush({});

    apiService.updateAnnouncement(3, request).subscribe();
    const update = httpMock.expectOne('/announcements/3');
    expect(update.request.method).toBe('PUT');
    update.flush({});

    apiService.deleteAnnouncement(3).subscribe();
    const remove = httpMock.expectOne('/announcements/3');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });
});
