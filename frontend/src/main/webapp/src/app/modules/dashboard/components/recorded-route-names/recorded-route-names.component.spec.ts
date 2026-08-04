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

  it('recorded route names rendered when present', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('recordedRouteNames', ['Route 1', 'Route 3']);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-route-names"]')).nativeElement.textContent.trim())
      .toBe('Route 1, Route 3');
  });

  it('placeholder rendered when no route names present', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('recordedRouteNames', []);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-route-names"]')).nativeElement.textContent.trim()).toBe('-');
  });

  it('placeholder rendered when route names is null', () => {
    const fixture = TestBed.createComponent(RecordedRouteNamesComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-route-names"]')).nativeElement.textContent.trim()).toBe('-');
  });

});
