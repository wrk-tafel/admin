import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {StatisticsMiscComponent} from './statistics-misc.component';
import {SchoolStarterPackageSearchResult, StatisticsApiService} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('StatisticsMiscComponent', () => {
  let statisticsApiService: MockedObject<StatisticsApiService>;

  const mockResult: SchoolStarterPackageSearchResult = {
    items: [
      {householdId: 1, firstname: 'Kind', lastname: 'Mustermann', age: 8}
    ],
    totalCount: 1,
    currentPage: 1,
    totalPages: 1,
    pageSize: 25
  };

  beforeEach(() => {
    const statisticsApiServiceSpy = {
      getSchoolStarterPackageData: vi.fn().mockReturnValue(of(mockResult)),
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

  it('loads data for the default age range on init', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(statisticsApiService.getSchoolStarterPackageData).toHaveBeenCalledWith(6, 10, undefined);
    expect(component.schoolStarterPackageData()).toEqual(mockResult);
  });

  it('reloads data when the age range changes', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onAgeMinChange(0);

    expect(component.schoolStarterPackageAgeMin()).toBe(0);
    expect(statisticsApiService.getSchoolStarterPackageData).toHaveBeenCalledWith(0, 10, undefined);

    component.onAgeMaxChange(3);

    expect(component.schoolStarterPackageAgeMax()).toBe(3);
    expect(statisticsApiService.getSchoolStarterPackageData).toHaveBeenCalledWith(0, 3, undefined);
  });

  it('loads the requested page on paginator page change', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onPageChange({pageIndex: 1, pageSize: 25, length: 30});

    expect(statisticsApiService.getSchoolStarterPackageData).toHaveBeenCalledWith(6, 10, 2);
  });

});
