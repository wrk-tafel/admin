import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionStatisticsInputComponent} from './distribution-statistics-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {of, throwError} from 'rxjs';
import {ShelterItem} from '../../../../api/shelter-api.service';

describe('DistributionStatisticsInputComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

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
          useValue: jasmine.createSpyObj('DistributionApiService', ['saveStatisticData'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('save data successful', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveStatisticData.and.returnValue(of(null));

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

    expect(distributionApiService.saveStatisticData).toHaveBeenCalledWith(100, [1, 2]);
    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.SUCCESS,
      title: 'Statistik-Daten gespeichert!'
    });
  });

  it('person count updated after edit', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
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
    distributionApiService.saveStatisticData.and.returnValue(throwError(() => {
        return {status: 500};
      })
    );
    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterIds', testShelters.map(shelter => shelter.id));
    fixture.detectChanges();

    component.save();

    expect(distributionApiService.saveStatisticData).toHaveBeenCalledWith(100, [1, 2]);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

  it('inputs are reflected to form', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;

    componentRef.setInput('sheltersData', {shelters: testShelters});
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('initialSelectedShelterIds', testShelters.map(shelter => shelter.id));
    fixture.detectChanges();

    expect(component.employeeCount.value).toBe(100);
    expect(component.personsInShelterCount.value).toBe(300);
  });

});
