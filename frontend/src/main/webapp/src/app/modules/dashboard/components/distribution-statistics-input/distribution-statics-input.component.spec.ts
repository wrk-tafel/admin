import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionStatisticsInputComponent} from './distribution-statistics-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from "../../../../common/views/default-layout/toasts/toast.service";
import {of, throwError} from "rxjs";

describe('DistributionStatisticsInputComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

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

    component.save();

    expect(distributionApiService.saveStatisticData).toHaveBeenCalledWith(100, 200);
    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.SUCCESS,
      title: 'Statistik-Daten gespeichert!'
    });
  });

  it('save data failed', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveStatisticData.and.returnValue(throwError(() => {
        return {status: 500};
      })
    );

    component.employeeCount.setValue(100);
    component.personsInShelterCount.setValue(200);

    component.save();

    expect(distributionApiService.saveStatisticData).toHaveBeenCalledWith(100, 200);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

  it('inputs are reflected to form', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    componentRef.setInput('employeeCountInput', 100);
    componentRef.setInput('personsInShelterCountInput', 200);
    fixture.detectChanges();

    expect(component.employeeCount.value).toBe(100);
    expect(component.personsInShelterCount.value).toBe(200);
  });

});
