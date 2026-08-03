import {TestBed} from '@angular/core/testing';
import {RecordedFoodCollectionsComponent} from './recorded-food-collections.component';
import {By} from '@angular/platform-browser';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { signal } from '@angular/core';

describe('RecordedFoodCollectionsComponent', () => {
  let globalStateService: any;

  beforeEach((() => {
    globalStateService = {
      getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: GlobalStateService, useValue: globalStateService }
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('recorded food collections count rendered', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe('2 / 5');
  });

  it('recorded food collections count rendered without active distribution', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe('-');
  });

  it('panel color primary without active distribution', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;

    const color = component.panelColor();
    expect(color).toBe('primary');
  });

  it('panel color warning when not all data is recorded', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    const color = component.panelColor();
    expect(color).toBe('warning');
  });

  it('panel color success when all data is recorded', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 5);
    componentRef.setInput('countTotal', 5);

    const color = component.panelColor();
    expect(color).toBe('success');
  });

  it('recorded route names rendered when present', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);
    componentRef.setInput('recordedRouteNames', ['Route 1', 'Route 3']);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-route-names"]')).nativeElement.textContent.trim())
      .toBe('Route 1, Route 3');
  });

  it('recorded route names not rendered when empty', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 0);
    componentRef.setInput('countTotal', 5);
    componentRef.setInput('recordedRouteNames', []);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-route-names"]'))).toBeNull();
  });

});
