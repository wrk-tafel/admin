import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {DistributionStatisticsInputComponent} from './distribution-statistics-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

describe('DistributionStatisticsInputComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  const testShelters: ShelterItem[] = [
    {
      id: 1,
      name: 'Test Shelter 1',
      addressStreet: 'Test Street',
      addressHouseNumber: '1',
      addressStairway: 'A',
      addressDoor: 'B',
      addressPostalCode: 12345,
      addressCity: 'Test City',
      note: 'Test Note',
      personsCount: 100
    },
    {
      id: 2,
      name: 'Test Shelter 2',
      addressStreet: 'Test Street',
      addressHouseNumber: '1',
      addressStairway: 'A',
      addressDoor: 'B',
      addressPostalCode: 12345,
      addressCity: 'Test City',
      note: 'Test Note 2',
      personsCount: 200
    }
  ];
  const testDistribution: DistributionItem = {
    id: 123,
    startedAt: new Date()
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ModalModule,
        CardModule,
        RowComponent,
        ColComponent,
        ProgressModule
      ],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['saveStatistic'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('save data successful', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveStatistic.and.returnValue(of(null));

    component.employeeCount.setValue(100);
    component.personsInShelterCount.setValue(200);
    component.selectedShelters = [
      {
        id: 1,
        name: 'Shelter 1',
        addressStreet: 'Street',
        addressHouseNumber: '1',
        addressPostalCode: 1210,
        addressCity: 'Wien',
        note: 'Testnote 1',
        personsCount: 100
      },
      {
        id: 2,
        name: 'Shelter 2',
        addressStreet: 'Street',
        addressHouseNumber: '2',
        addressPostalCode: 1220,
        addressCity: 'Wien',
        note: 'Testnote 2',
        personsCount: 50
      }
    ];

    component.save();

    expect(distributionApiService.saveStatistic).toHaveBeenCalledWith(100, [1, 2]);
    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.SUCCESS,
      title: 'Statistik-Daten gespeichert!'
    });
  });

  it('person count updated after edit', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));
    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('initialSelectedShelterIds', testShelters[0].id);
    fixture.detectChanges();

    component.onUpdateSelectedShelters(testShelters)

    expect(component.personsInShelterCount.value).toBe(300);
  });

  it('save data failed', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    distributionApiService.saveStatistic.and.returnValue(throwError(() => {
        return {status: 500};
      })
    );
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterNames', testShelters.map(shelter => shelter.name));
    fixture.detectChanges();

    component.save();

    expect(distributionApiService.saveStatistic).toHaveBeenCalledWith(100, [1, 2]);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

  it('inputs are reflected to form', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterNames', testShelters.map(shelter => shelter.name));
    fixture.detectChanges();

    expect(component.employeeCount.value).toBe(100);
    expect(component.personsInShelterCount.value).toBe(300);
  });

  it('employeeCount disabled and data reset without active distribution', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(null));

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterNames', testShelters.map(shelter => shelter.name));
    fixture.detectChanges();

    component.ngOnInit();

    expect(component.employeeCount.disabled).toBeTrue();
    expect(component.panelDisabled()).toBeTrue();
    expect(component.employeeCount.value).toBeNull();
    expect(component.personsInShelterCount.value).toBeNull();
  });

});
