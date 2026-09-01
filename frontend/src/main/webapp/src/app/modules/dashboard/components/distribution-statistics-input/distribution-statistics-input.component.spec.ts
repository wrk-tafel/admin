import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';
import {signal} from '@angular/core';
import {DistributionStatisticsInputComponent} from './distribution-statistics-input.component';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('DistributionStatisticsInputComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let toastr: MockedObject<TafelToastrService>;

  beforeEach(() => {
    const distributionApiServiceSpy = {
      saveStatistic: vi.fn().mockName('DistributionApiService.saveStatistic')
    };
    const toastrSpy = {
      success: vi.fn().mockName('TafelToastrService.success'),
      error: vi.fn().mockName('TafelToastrService.error')
    };
    const testDistribution: DistributionItem = {id: 1, startedAt: new Date()};
    const globalStateServiceSpy = {
      getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
        .mockReturnValue(signal<DistributionItem | null>(testDistribution).asReadonly())
    };

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        {provide: DistributionApiService, useValue: distributionApiServiceSpy},
        {provide: TafelToastrService, useValue: toastrSpy},
        {provide: GlobalStateService, useValue: globalStateServiceSpy}
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  it('does not save and marks the field touched when employee count is empty', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    fixture.detectChanges();

    fixture.componentInstance.save();

    expect(distributionApiService.saveStatistic).not.toHaveBeenCalled();
    expect(fixture.componentInstance.employeeCount.touched).toBe(true);
  });

  it('does not save when employee count is 0', () => {
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    fixture.detectChanges();
    fixture.componentInstance.employeeCount.setValue(0);

    fixture.componentInstance.save();

    expect(distributionApiService.saveStatistic).not.toHaveBeenCalled();
  });

  it('saves when the form is valid', () => {
    distributionApiService.saveStatistic.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(DistributionStatisticsInputComponent);
    fixture.detectChanges();
    fixture.componentInstance.employeeCount.setValue(5);

    fixture.componentInstance.save();

    expect(distributionApiService.saveStatistic).toHaveBeenCalledWith(5, []);
    expect(toastr.success).toHaveBeenCalledWith('Statistik-Daten gespeichert!');
  });
});
