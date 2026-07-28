import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {StatisticsMiscComponent} from './statistics-misc.component';
import {SchoolStarterPackageEntry, StatisticsApiService} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('StatisticsMiscComponent', () => {
  let statisticsApiService: MockedObject<StatisticsApiService>;

  const mockEntries: SchoolStarterPackageEntry[] = Array.from({length: 15}, (_, i) => ({
    householdId: i + 1,
    firstname: `Kind${i + 1}`,
    lastname: 'Mustermann',
    age: 8
  }));

  beforeEach(() => {
    const statisticsApiServiceSpy = {
      getSchoolStarterPackageData: vi.fn().mockReturnValue(of(mockEntries)),
      generateSchoolStarterPackageCsv: vi.fn()
    } as any;

    const fileHelperServiceSpy = {
      downloadFile: vi.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: StatisticsApiService, useValue: statisticsApiServiceSpy},
        {provide: FileHelperService, useValue: fileHelperServiceSpy}
      ]
    }).compileComponents();

    statisticsApiService = TestBed.inject(StatisticsApiService) as MockedObject<StatisticsApiService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('loads data for the default age range and reports the total count', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(statisticsApiService.getSchoolStarterPackageData).toHaveBeenCalledWith(6, 10);
    expect(component.schoolStarterPackageData()?.length).toBe(15);
  });

  it('paginates the results client-side', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.pagedSchoolStarterPackageData().length).toBe(10);
    expect(component.pagedSchoolStarterPackageData()[0].householdId).toBe(1);

    component.onPageChange({pageIndex: 1, pageSize: 10, length: 15});

    expect(component.pagedSchoolStarterPackageData().length).toBe(5);
    expect(component.pagedSchoolStarterPackageData()[0].householdId).toBe(11);
  });

  it('resets to the first page when the age range changes', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onPageChange({pageIndex: 1, pageSize: 10, length: 15});
    expect(component.pageIndex()).toBe(1);

    component.schoolStarterPackageAgeMin.set(0);
    fixture.detectChanges();

    expect(component.pageIndex()).toBe(0);
  });

});
