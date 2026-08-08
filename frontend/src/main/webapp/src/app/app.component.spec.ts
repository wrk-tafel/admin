import {TestBed} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router} from '@angular/router';
import {Subject} from 'rxjs';
import {signal} from '@angular/core';
import {AuthenticationService} from './common/security/authentication.service';
import {PushNotificationService} from './common/pwa/push-notification.service';

describe('AppComponent', () => {
  let routerEventsSubject: Subject<any>;
  let userInfo: ReturnType<typeof signal<{ username: string; permissions: string[] } | null>>;
  let pushNotificationService: { syncSubscription: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    routerEventsSubject = new Subject();
    userInfo = signal<{ username: string; permissions: string[] } | null>(null);
    pushNotificationService = {syncSubscription: vi.fn().mockResolvedValue(false)};

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: routerEventsSubject.asObservable()
          }
        },
        {provide: AuthenticationService, useValue: {userInfo}},
        {provide: PushNotificationService, useValue: pushNotificationService}
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not show the bar before the show-delay has elapsed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('sets navigating to true once the show-delay elapses for a still in-flight navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(app.navigating()).toBe(true);
  });

  it('never shows the bar for a navigation that settles before the show-delay elapses', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    fixture.detectChanges();
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('sets navigating to false on NavigationEnd', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('sets navigating to false on NavigationCancel', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    routerEventsSubject.next(new NavigationCancel(1, '/test', 'test'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('sets navigating to false on NavigationError', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    routerEventsSubject.next(new NavigationError(1, '/test', new Error('test')));
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('ignores a stale End event from a navigation already superseded by a newer one', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    // navigation 1 starts, then navigation 2 starts and supersedes it before 1 settles
    routerEventsSubject.next(new NavigationStart(1, '/test'));
    routerEventsSubject.next(new NavigationStart(2, '/test-2'));
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    // a late/stale End for the superseded navigation 1 must not clear the bar for navigation 2
    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(true);

    routerEventsSubject.next(new NavigationEnd(2, '/test-2', '/test-2'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(false);
  });

  it('scrolls to top on NavigationEnd', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    fixture.detectChanges();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  describe('push subscription sync', () => {
    it('does not sync while nobody is logged in', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(pushNotificationService.syncSubscription).not.toHaveBeenCalled();
    });

    it('syncs once a session exists', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      userInfo.set({username: 'test-user', permissions: []});
      fixture.detectChanges();

      expect(pushNotificationService.syncSubscription).toHaveBeenCalledOnce();
    });

    /**
     * A reload into an existing session populates userInfo before the component ever renders, which
     * is the case that actually re-registers a device after its backend row was lost.
     */
    it('syncs when the app starts up into an existing session', () => {
      userInfo.set({username: 'test-user', permissions: []});

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(pushNotificationService.syncSubscription).toHaveBeenCalledOnce();
    });

    it('syncs again when a different user logs in on the same device', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      userInfo.set({username: 'test-user', permissions: []});
      fixture.detectChanges();
      userInfo.set(null);
      fixture.detectChanges();
      userInfo.set({username: 'other-user', permissions: []});
      fixture.detectChanges();

      expect(pushNotificationService.syncSubscription).toHaveBeenCalledTimes(2);
    });
  });

});
