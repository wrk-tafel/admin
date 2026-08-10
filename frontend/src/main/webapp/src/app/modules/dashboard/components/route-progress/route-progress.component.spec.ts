import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {RouteProgressComponent} from './route-progress.component';
import {DashboardRouteProgressData} from '../../dashboard.component';

describe('RouteProgressComponent', () => {
  const route1: DashboardRouteProgressData = {
    routeId: 1,
    routeNumber: 1,
    routeName: 'Route 1',
    completedStops: 3,
    totalStops: 4
  };
  const route2: DashboardRouteProgressData = {
    routeId: 2,
    routeNumber: 2,
    routeName: 'Route 2',
    completedStops: 2,
    totalStops: 2
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule]
    }).compileComponents();
  });

  function createComponent(routeProgress: DashboardRouteProgressData[] | null) {
    const fixture = TestBed.createComponent(RouteProgressComponent);
    fixture.componentRef.setInput('routeProgress', routeProgress);
    fixture.detectChanges();
    return fixture;
  }

  it('component can be created', () => {
    expect(createComponent(null).componentInstance).toBeTruthy();
  });

  it('lists one entry per route with its counts', () => {
    const fixture = createComponent([route1, route2]);

    const entries = fixture.debugElement.queryAll(By.css('[testid^="route-progress-entry-"]'));
    expect(entries.length).toBe(2);
    expect(entries[0].nativeElement.textContent).toContain('Route 1');
    expect(fixture.debugElement.query(By.css('[testid="route-progress-count-1"]')).nativeElement.textContent.trim())
      .toBe('3 / 4');
    expect(fixture.debugElement.query(By.css('[testid="route-progress-count-2"]')).nativeElement.textContent.trim())
      .toBe('2 / 2');
  });

  it('turns the counts into a percentage and a done flag', () => {
    const fixture = createComponent([route1, route2]);
    const [first, second] = fixture.componentInstance['routes']();

    expect(first.percent).toBe(75);
    expect(first.done).toBe(false);
    expect(second.percent).toBe(100);
    expect(second.done).toBe(true);
  });

  it('names the progress bar so it is readable without seeing it', () => {
    const fixture = createComponent([route1]);

    expect(fixture.componentInstance['routes']()[0].label)
      .toBe('Route 1: 3 von 4 Stopps erledigt');
    expect(fixture.debugElement.query(By.css('mat-progress-bar')).attributes['aria-label'])
      .toBe('Route 1: 3 von 4 Stopps erledigt');
  });

  it('shows a placeholder when no route is under way', () => {
    const fixture = createComponent(null);

    expect(fixture.debugElement.query(By.css('[testid^="route-progress-entry-"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[testid="route-progress-empty"]')).nativeElement.textContent.trim())
      .toBe('-');
  });
});
