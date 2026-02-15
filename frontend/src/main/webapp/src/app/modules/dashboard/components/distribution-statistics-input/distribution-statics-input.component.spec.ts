import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {DistributionStatisticsInputComponent} from './distribution-statistics-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {of, throwError} from 'rxjs';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import { signal } from '@angular/core';

describe('DistributionStatisticsInputComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let toastService: MockedObject<ToastService>;
  let globalStateService: MockedObject<GlobalStateService>;

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

  beforeEach(() => {
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
          useValue: {
            saveStatistic: vi.fn().mockName('DistributionApiService.saveStatistic')
          }
        },
        {
          provide: ToastService,
          useValue: {
            showToast: vi.fn().mockName('ToastService.showToast')
          }
        },
        {
          provide: GlobalStateService,
          useValue: {
            getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution').mockReturnValue(signal(testDistribution).asReadonly())
          }
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
    globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('save data successful', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveStatistic.mockReturnValue(of(null));

    component.employeeCount.setValue(100);
    component.personsInShelterCount.setValue(200);
    component.selectedShelters.set([
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
    ]);

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
    globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(testDistribution).asReadonly());
    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('initialSelectedShelterNames', [testShelters[0].name]);
    fixture.detectChanges();

    component.onUpdateSelectedShelters(testShelters)

    expect(component.personsInShelterCount.value).toBe(300);
  });

  it('save data failed', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    distributionApiService.saveStatistic.mockReturnValue(throwError(() => {
        return {status: 500};
      })
    );
    globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(testDistribution).asReadonly());

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
    globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(testDistribution).asReadonly());

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterNames', testShelters.map(shelter => shelter.name));
    fixture.detectChanges();

    expect(component.employeeCount.value).toBe(100);
    expect(component.personsInShelterCount.value).toBe(300);
  });

  it('employeeCount disabled and data reset without active distribution', () => {
    globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(null).asReadonly());

    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('initialSelectedShelterNames', []);
    fixture.detectChanges();

    expect(component.employeeCount.disabled).toBe(true);
    expect(component.panelDisabled()).toBe(true);
    expect(component.employeeCount.value).toBeUndefined();
    expect(component.personsInShelterCount.value).toBeNull();
  });

});
