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

  it('renders the ratio as a progress bar once a total is known', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);
    fixture.detectChanges();

    const bar = fixture.debugElement.query(By.css('[testid="recorded-food-collections-progress"]'));
    expect(bar.attributes['aria-valuenow']).toBe('40');
  });

  it('renders no progress bar before a total is known', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-progress"]'))).toBeNull();
  });

  it('renders a 0%-wide progress bar when nothing is recorded yet, not none at all', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal({id: 123, startedAt: new Date()}).asReadonly());

    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 0);
    componentRef.setInput('countTotal', 5);
    fixture.detectChanges();

    const bar = fixture.debugElement.query(By.css('[testid="recorded-food-collections-progress"]'));
    expect(bar.attributes['aria-valuenow']).toBe('0');
  });

});
