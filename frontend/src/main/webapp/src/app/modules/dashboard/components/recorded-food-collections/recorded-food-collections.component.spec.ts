import {TestBed} from '@angular/core/testing';
import {RecordedFoodCollectionsComponent} from './recorded-food-collections.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideZonelessChangeDetection} from "@angular/core";
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {BehaviorSubject} from 'rxjs';
import {DistributionItem} from '../../../../api/distribution-api.service';

describe('RecordedFoodCollectionsComponent', () => {
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    
    // Setup mock for GlobalStateService
    const mockDistribution: DistributionItem = {
      id: 123,
      name: 'Test Distribution'
    } as DistributionItem;
    const mockBehaviorSubject = new BehaviorSubject<DistributionItem>(mockDistribution);
    globalStateService.getCurrentDistribution.and.returnValue(mockBehaviorSubject);
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('recorded food collections count rendered', async () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe(`2 / 5`);
  });

  it('recorded food collections count rendered without active distribution', async () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);

    await fixture.whenStable();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe(`-`);
  });

  it('panel color primary without active distribution', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;

    const color = component.getPanelColor();
    expect(color).toBe('primary');
  });

  it('panel color warning when not all data is recorded', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    component.distribution = {id: 123};
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    const color = component.getPanelColor();
    expect(color).toBe('warning');
  });

  it('panel color success when all data is recorded', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    component.distribution = {id: 123};
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 5);
    componentRef.setInput('countTotal', 5);

    const color = component.getPanelColor();
    expect(color).toBe('success');
  });

});
