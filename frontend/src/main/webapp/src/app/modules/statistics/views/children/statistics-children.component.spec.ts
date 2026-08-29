import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of, Subject} from 'rxjs';
import dayjs from 'dayjs';
import {provideRouter} from '@angular/router';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {StatisticsChildrenComponent} from './statistics-children.component';
import {
  ChildrenAgeDistribution,
  ChildrenSearchResult,
  StatisticsApiService
} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';

describe('StatisticsChildrenComponent', () => {
  let statisticsApiService: MockedObject<StatisticsApiService>;

  const today = dayjs().startOf('day').toDate();

  const mockResult: ChildrenSearchResult = {
    items: [
      {householdId: 1, firstname: 'Kind', lastname: 'Mustermann', age: 8},
      {householdId: 1, firstname: 'Geschwister', lastname: 'Mustermann', age: 7},
      {householdId: 2, firstname: 'Kind', lastname: 'Musterfrau', age: 6}
    ],
    totalCount: 3,
    currentPage: 1,
    totalPages: 1,
    pageSize: 25
  };

  const mockDistribution: ChildrenAgeDistribution = {
    items: [
      {age: 6, count: 1},
      {age: 7, count: 1},
      {age: 8, count: 1}
    ]
  };

  beforeEach(() => {
    const statisticsApiServiceSpy = {
      getChildrenData: vi.fn().mockReturnValue(of(mockResult)),
      getChildrenAgeDistribution: vi.fn().mockReturnValue(of(mockDistribution)),
      generateChildrenCsv: vi.fn()
    } as any;

    const fileHelperServiceSpy = {
      downloadFile: vi.fn()
    } as any;

    const authenticationServiceSpy = {
      hasPermission: vi.fn().mockReturnValue(true)
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideCharts(withDefaultRegisterables()),
        {provide: StatisticsApiService, useValue: statisticsApiServiceSpy},
        {provide: FileHelperService, useValue: fileHelperServiceSpy},
        {provide: AuthenticationService, useValue: authenticationServiceSpy}
      ]
    }).compileComponents();

    statisticsApiService = TestBed.inject(StatisticsApiService) as MockedObject<StatisticsApiService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('loads data and the age distribution for the default filter on init', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedFilter = {ageMin: 6, ageMax: 10, referenceDate: today};
    expect(statisticsApiService.getChildrenData).toHaveBeenCalledWith(expectedFilter, undefined, undefined);
    expect(statisticsApiService.getChildrenAgeDistribution).toHaveBeenCalledWith(expectedFilter);
    expect(component.childrenData()).toEqual(mockResult);
    expect(component.ageDistribution()).toEqual(mockDistribution);
    expect(component.totalCount()).toBe(3);
  });

  it('reloads data when the age range changes', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.filterForm.patchValue({ageMin: 0, ageMax: 3});

    expect(statisticsApiService.getChildrenData)
      .toHaveBeenCalledWith({ageMin: 0, ageMax: 3, referenceDate: today}, undefined, undefined);
  });

  it('reloads data when the reference date changes', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.filterForm.patchValue({referenceDate: '2026-09-01'});

    expect(statisticsApiService.getChildrenData)
      .toHaveBeenCalledWith({ageMin: 6, ageMax: 10, referenceDate: dayjs('2026-09-01').toDate()}, undefined, undefined);
  });

  it('applies the school age preset', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.applySchoolAgePreset();

    expect(component.filterForm.getRawValue().ageMin).toBe(6);
    expect(component.filterForm.getRawValue().ageMax).toBe(15);
    expect(statisticsApiService.getChildrenData)
      .toHaveBeenCalledWith({ageMin: 6, ageMax: 15, referenceDate: today}, undefined, undefined);
  });

  it('does not request anything while the filter is invalid', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    statisticsApiService.getChildrenData.mockClear();
    statisticsApiService.getChildrenAgeDistribution.mockClear();

    component.filterForm.patchValue({ageMin: 11, ageMax: 10});
    expect(component.filterForm.hasError('ageRange')).toBe(true);

    component.filterForm.patchValue({ageMin: null, ageMax: 10});
    component.filterForm.patchValue({ageMin: 6, ageMax: 200});

    expect(statisticsApiService.getChildrenData).not.toHaveBeenCalled();
    expect(statisticsApiService.getChildrenAgeDistribution).not.toHaveBeenCalled();
  });

  it('keeps the applied filter of the data on screen while the form is invalid', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.filterForm.patchValue({ageMin: 11, ageMax: 10});

    expect(component.appliedFilter()).toEqual({ageMin: 6, ageMax: 10, referenceDate: today});
  });

  it('marks the first row of each household so consecutive siblings can be grouped', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.rows().map(row => row.firstOfHousehold)).toEqual([true, false, true]);
  });

  it('describes the age distribution as the chart label', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.chartLabel()).toBe('Verteilung nach Alter - 6 Jahre: 1, 7 Jahre: 1, 8 Jahre: 1');
    expect(component.chartData().labels).toEqual(['6', '7', '8']);
    expect(component.chartData().datasets[0].data).toEqual([1, 1, 1]);
  });

  // A fast second edit's response can arrive before the first, slower one's - the older response
  // must never overwrite what the newer request already applied. See #3530.
  it('a slower stale response never overwrites a newer one already applied', () => {
    const firstResponse = new Subject<ChildrenSearchResult>();
    const secondResult: ChildrenSearchResult = {...mockResult, totalCount: 99};

    statisticsApiService.getChildrenData
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(of(secondResult));

    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.filterForm.patchValue({ageMin: 0, ageMax: 3});
    // The second, faster request has already resolved and been applied by the time the first,
    // slower one finally answers.
    firstResponse.next(mockResult);
    firstResponse.complete();

    expect(component.childrenData()).toEqual(secondResult);
    expect(component.appliedFilter()).toEqual({ageMin: 0, ageMax: 3, referenceDate: today});
  });

  it('loads the requested page on paginator page change', () => {
    const fixture = TestBed.createComponent(StatisticsChildrenComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onPageChange({pageIndex: 1, pageSize: 25, length: 30});

    expect(statisticsApiService.getChildrenData)
      .toHaveBeenCalledWith({ageMin: 6, ageMax: 10, referenceDate: today}, 2, 25);
  });

});
