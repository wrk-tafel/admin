import {TestBed} from '@angular/core/testing';
import {RecordedRouteNamesComponent} from './recorded-route-names.component';
import {By} from '@angular/platform-browser';

describe('RecordedRouteNamesComponent', () => {

  beforeEach((() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('renders every active route as a chip, recorded ones marked apart from outstanding ones', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('allRouteNames', ['Route 1', 'Route 2', 'Route 3']);
    componentRef.setInput('recordedRouteNames', ['Route 1', 'Route 3']);

    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('mat-chip'));
    expect(chips.length).toBe(3);
    expect(chips[0].nativeElement.textContent.trim()).toContain('Route 1');
    expect(chips[0].nativeElement.classList).toContain('route-chip-recorded');
    expect(chips[1].nativeElement.textContent.trim()).toContain('Route 2');
    expect(chips[1].nativeElement.classList).not.toContain('route-chip-recorded');
    expect(chips[2].nativeElement.classList).toContain('route-chip-recorded');
  });

  it('placeholder rendered when no active routes exist', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('allRouteNames', []);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-route-names"]')).nativeElement.textContent.trim()).toBe('-');
  });

  it('placeholder rendered when allRouteNames is null', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-route-names"]')).nativeElement.textContent.trim()).toBe('-');
  });

  it('a route not yet in recordedRouteNames is outstanding, not recorded', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('allRouteNames', ['Route 1']);
    componentRef.setInput('recordedRouteNames', []);

    fixture.detectChanges();

    expect(fixture.componentInstance['routes']()).toEqual([{name: 'Route 1', recorded: false}]);
  });

});
