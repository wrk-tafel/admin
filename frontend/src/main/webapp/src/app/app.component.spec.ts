import {TestBed} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router} from '@angular/router';
import {Subject} from 'rxjs';

describe('AppComponent', () => {
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    routerEventsSubject = new Subject();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: routerEventsSubject.asObservable()
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('sets navigating to true on NavigationStart', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
    fixture.detectChanges();

    expect(app.navigating()).toBe(true);
  });

  it('sets navigating to false on NavigationEnd', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    routerEventsSubject.next(new NavigationStart(1, '/test'));
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

});
