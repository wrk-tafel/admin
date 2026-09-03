import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ComponentFixture} from '@angular/core/testing';
import {StatisticsGeneralComponent} from './statistics-general.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import dayjs from 'dayjs';
import {StatisticsData, StatisticsDetailData, StatisticsSettings} from '../../../../api/statistics-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('StatisticsGeneralComponent', () => {
  let httpMock: HttpTestingController;
  let fileHelperService: MockedObject<FileHelperService>;

  const distributions = [
    {startDate: '2026-08-08T10:00:00', endDate: '2026-08-08T18:00:00'},
    {startDate: '2026-08-01T10:00:00', endDate: '2026-08-01T18:00:00'},
    {startDate: '2024-06-01T10:00:00', endDate: '2024-06-01T18:00:00'}
  ] as unknown as StatisticsSettings['distributions'];

  const settings: StatisticsSettings = {
    availableYears: [2026, 2025, 2024],
    distributions: distributions
  };

  function detail(value: number): StatisticsDetailData {
    return {title: `${value}`, subTitle: 'Test', value: value, labels: ['a'], dataPoints: [value]};
  }

  function statisticsData(value: number): StatisticsData {
    return {
      beneficiaryCustomers: detail(value),
      beneficiaryPersons: detail(value),
      beneficiaryCustomersWithChildren: detail(value),
      singleParentHouseholds: detail(value),
      sheltersCount: detail(value),
      sheltersAverage: detail(value),
      sheltersPersonsCount: detail(value),
      shopsCount: detail(value),
      shopItemsTotal: detail(value),
      shopItemsAverage: detail(value)
    };
  }

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables()),
        {
          provide: FileHelperService,
          useValue: {
            downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
          }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
  }));

  afterEach(() => {
    httpMock.verify();
  });

  function createComponent(): ComponentFixture<StatisticsGeneralComponent> {
    const fixture = TestBed.createComponent(StatisticsGeneralComponent);
    fixture.componentRef.setInput('settings', settings);
    fixture.detectChanges();
    return fixture;
  }

  function respond(fixture: ComponentFixture<StatisticsGeneralComponent>, current: number, previous: number) {
    const requests = httpMock.match(request => request.url === '/statistics/data');
    expect(requests.length).toEqual(2);

    requests[0].flush(statisticsData(current));
    requests[1].flush(statisticsData(previous));
    fixture.detectChanges();

    return requests;
  }

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsGeneralComponent);
    expect(fixture.componentInstance).toBeTruthy();

    fixture.detectChanges();
    httpMock.match(request => request.url === '/statistics/data').forEach(request => request.flush(statisticsData(1)));
  });

  it('loads the current year and the same period of the year before', () => {
    const fixture = createComponent();
    const requests = respond(fixture, 100, 80);

    expect(requests[0].request.params.get('fromDate')).toEqual(dayjs().startOf('year').format('YYYY-MM-DD'));
    expect(requests[0].request.params.get('toDate')).toEqual(dayjs().format('YYYY-MM-DD'));
    expect(requests[1].request.params.get('fromDate'))
      .toEqual(dayjs().startOf('year').subtract(1, 'year').format('YYYY-MM-DD'));
    expect(requests[1].request.params.get('toDate')).toEqual(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));

    expect(fixture.componentInstance.loading()).toBeFalsy();
    expect(fixture.componentInstance.comparisonLabel()).toEqual('ggü. Vorjahr');
    expect(fixture.componentInstance.panelGroups()[0].panels[0].data?.value).toEqual(100);
    expect(fixture.componentInstance.panelGroups()[0].panels[0].comparison?.value).toEqual(80);
  });

  it('shows a skeleton until the numbers arrive', () => {
    const fixture = TestBed.createComponent(StatisticsGeneralComponent);
    fixture.componentRef.setInput('settings', settings);

    expect(fixture.componentInstance.loading()).toBeTruthy();

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[testid="statisticsPanel-beneficiaryCustomers-skeleton"]')).toBeTruthy();

    respond(fixture, 100, 80);
    expect(fixture.nativeElement.querySelector('[testid="statisticsPanel-beneficiaryCustomers-skeleton"]')).toBeNull();
  });

  it('returns to the running year from another mode in one click', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('previousYear');
    fixture.detectChanges();
    httpMock.match(request => request.url === '/statistics/data')
      .forEach(request => request.flush(statisticsData(1)));

    fixture.componentInstance.onModeChange('currentYear');
    fixture.detectChanges();

    const requests = httpMock.match(request => request.url === '/statistics/data');
    expect(requests[0].request.params.get('fromDate')).toEqual(dayjs().startOf('year').format('YYYY-MM-DD'));
    expect(requests[0].request.params.get('toDate')).toEqual(dayjs().format('YYYY-MM-DD'));
    expect(requests[1].request.params.get('fromDate'))
      .toEqual(dayjs().startOf('year').subtract(1, 'year').format('YYYY-MM-DD'));

    requests.forEach(request => request.flush(statisticsData(1)));
    fixture.detectChanges();
  });

  it('compares the previous year with the year before it', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('previousYear');
    fixture.detectChanges();

    const requests = httpMock.match(request => request.url === '/statistics/data');
    const previousYear = dayjs().year() - 1;
    expect(requests[0].request.params.get('fromDate')).toEqual(`${previousYear}-01-01`);
    expect(requests[0].request.params.get('toDate')).toEqual(`${previousYear}-12-31`);
    expect(requests[1].request.params.get('fromDate')).toEqual(`${previousYear - 1}-01-01`);
    expect(requests[1].request.params.get('toDate')).toEqual(`${previousYear - 1}-12-31`);

    requests.forEach(request => request.flush(statisticsData(1)));
    fixture.detectChanges();
  });

  it('compares a distribution with the one recorded before it', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('distribution');
    fixture.componentInstance.onDistributionSelected(settings.distributions[0]);
    fixture.detectChanges();

    const requests = httpMock.match(request => request.url === '/statistics/data');
    expect(requests[0].request.params.get('fromDate')).toEqual('2026-08-08');
    expect(requests[1].request.params.get('fromDate')).toEqual('2026-08-01');

    requests.forEach(request => request.flush(statisticsData(1)));
    fixture.detectChanges();

    expect(fixture.componentInstance.comparisonLabel()).toEqual('ggü. voriger Ausgabe');
    expect(fixture.componentInstance.comparisonRangeLabel()).toEqual('01.08.2026 - 01.08.2026');
  });

  it('asks only for the shown period when there is nothing to compare it with', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('distribution');
    fixture.componentInstance.onDistributionSelected(settings.distributions[2]);
    fixture.detectChanges();

    const requests = httpMock.match(request => request.url === '/statistics/data');
    expect(requests.length).toEqual(1);

    requests[0].flush(statisticsData(1));
    fixture.detectChanges();

    expect(fixture.componentInstance.comparisonRangeLabel()).toEqual('');
    expect(fixture.nativeElement.querySelector('[testid="statisticsPanel-beneficiaryCustomers"] [testid="panel-delta"]'))
      .toBeNull();
  });

  describe('distributionAutocompleteDisplay', () => {

    // MatAutocompleteTrigger writes a selected option's raw value straight into the native input
    // via this function, bypassing distributionDisplayText() - see the property's own doc comment.
    // Without this passthrough/formatting, re-picking the already-selected distribution showed
    // "[object Object]".
    it('passes an already-formatted string through unchanged', () => {
      const fixture = createComponent();
      respond(fixture, 1, 1);

      expect(fixture.componentInstance.distributionAutocompleteDisplay('Montag, 08.08.2026')).toEqual('Montag, 08.08.2026');
    });

    it('formats a raw distribution value the same way the option list does', () => {
      const fixture = createComponent();
      respond(fixture, 1, 1);
      const distribution = settings.distributions[0];

      expect(fixture.componentInstance.distributionAutocompleteDisplay(distribution))
        .toEqual(fixture.componentInstance.distributionLabel(distribution));
    });

    it('formats a raw undefined value as an empty string', () => {
      const fixture = createComponent();
      respond(fixture, 1, 1);

      expect(fixture.componentInstance.distributionAutocompleteDisplay(undefined)).toEqual('');
    });

  });

  it('rejects an inverted custom range instead of requesting it', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('custom');
    fixture.componentInstance.dateRangeFrom = '2024-06-30';
    fixture.componentInstance.dateRangeTo = '2024-01-01';
    fixture.detectChanges();

    expect(fixture.componentInstance.dateRangeInvalid()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="dateRangeError"]')).toBeTruthy();
    httpMock.expectNone(request => request.url === '/statistics/data');

    // the last valid answer stays on screen
    expect(fixture.componentInstance.panelGroups()[0].panels[0].data?.value).toEqual(100);
  });

  it('asks nothing while a date input is empty', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('custom');
    fixture.componentInstance.dateRangeTo = '';
    fixture.detectChanges();

    expect(fixture.componentInstance.dateRangeInvalid()).toBeTruthy();
    expect(fixture.componentInstance.dateRangeInverted()).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[testid="dateRangeError"]').textContent)
      .toContain('Bitte ein "von"- und ein "bis"-Datum angeben');
    httpMock.expectNone(request => request.url === '/statistics/data');
  });

  it('counts the distributions the shown period covers', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('custom');
    fixture.componentInstance.dateRangeFrom = '2026-08-01';
    fixture.componentInstance.dateRangeTo = '2026-08-31';
    fixture.detectChanges();
    httpMock.match(request => request.url === '/statistics/data')
      .forEach(request => request.flush(statisticsData(1)));
    fixture.detectChanges();

    expect(fixture.componentInstance.distributionsInRange()).toEqual(2);
    expect(fixture.nativeElement.querySelector('[testid="noDistributionsHint"]')).toBeNull();
  });

  it('says outright when the period holds no distribution at all', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.componentInstance.onModeChange('custom');
    fixture.componentInstance.dateRangeFrom = '2020-01-01';
    fixture.componentInstance.dateRangeTo = '2020-12-31';
    fixture.detectChanges();
    httpMock.match(request => request.url === '/statistics/data')
      .forEach(request => request.flush(statisticsData(1)));
    fixture.detectChanges();

    expect(fixture.componentInstance.distributionsInRange()).toEqual(0);
    expect(fixture.nativeElement.querySelector('[testid="noDistributionsHint"]')).toBeTruthy();
  });

  it('keeps the key figures standing when the comparison alone fails', () => {
    const fixture = createComponent();
    const requests = httpMock.match(request => request.url === '/statistics/data');

    requests[0].flush(statisticsData(100));
    requests[1].flush('failed', {status: 500, statusText: 'Server Error'});
    fixture.detectChanges();

    expect(fixture.componentInstance.panelGroups()[0].panels[0].data?.value).toEqual(100);
    expect(fixture.componentInstance.panelGroups()[0].panels[0].comparison).toBeUndefined();
    expect(fixture.componentInstance.loadFailed()).toBeFalsy();
    expect(fixture.componentInstance.comparisonRangeLabel()).toEqual('');
  });

  it('reports a failed request instead of leaving the cards loading', () => {
    const fixture = createComponent();
    const requests = httpMock.match(request => request.url === '/statistics/data');

    // the comparison first: a failing current request tears the whole forkJoin down, and a request
    // already cancelled by that can no longer be flushed
    requests[1].flush(statisticsData(80));
    requests[0].flush('failed', {status: 500, statusText: 'Server Error'});
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBeFalsy();
    expect(fixture.componentInstance.loadFailed()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="loadError"]')).toBeTruthy();
  });

  it('exports the applied range as csv', () => {
    const fixture = createComponent();
    respond(fixture, 100, 80);

    fixture.nativeElement.querySelector('[testid="csvExportButton"]').click();

    const request = httpMock.expectOne(request => request.url === '/statistics/generate-csv');
    expect(request.request.params.get('fromDate')).toEqual(dayjs().startOf('year').format('YYYY-MM-DD'));
    expect(request.request.params.get('toDate')).toEqual(dayjs().format('YYYY-MM-DD'));

    const blob = new Blob(['data']);
    request.flush(blob, {headers: {'content-disposition': 'inline; filename=export.csv'}});

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('export.csv', blob);
  });

});
