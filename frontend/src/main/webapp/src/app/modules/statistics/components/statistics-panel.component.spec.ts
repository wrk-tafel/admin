import {TestBed} from '@angular/core/testing';
import {StatisticsPanelComponent} from './statistics-panel.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {MatDialog} from '@angular/material/dialog';
import {StatisticsDetailDialogComponent} from './statistics-detail-dialog.component';

describe('StatisticsComponent', () => {
  const detail = {
    title: '42',
    subTitle: 'Test Subtitle',
    value: 42,
    labels: ['a', 'b', 'c'],
    dataPoints: [1, 2, 3]
  };

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables()),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  describe('the periods named under the sparkline', () => {
    /** Runs the x axis' tick callback over a whole course, the way Chart.js does. */
    function axisLabels(labels: string[]): string[] {
      const fixture = TestBed.createComponent(StatisticsPanelComponent);
      fixture.componentRef.setInput('data', {...detail, labels: labels, dataPoints: labels.map(() => 1)});
      fixture.detectChanges();

      const callback = fixture.componentInstance.optionsDefault.scales.x.ticks.callback;
      return labels.map((_label, index) => callback(index, index, labels));
    }

    it('names every period of a course that fits, without the year they share', () => {
      const labels = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];

      expect(axisLabels(labels)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
    });

    it('keeps the year of a course measured in years - there it is what tells them apart', () => {
      expect(axisLabels(['2023', '2024', '2025', '2026'])).toEqual(['2023', '2024', '2025', '2026']);
    });

    it('thins out a course too long to name in full, keeping its first and last period', () => {
      const labels = Array.from({length: 30}, (_value, index) => `2026-KW${index + 1}`);

      const named = axisLabels(labels);
      expect(named[0]).toEqual('KW1');
      expect(named[named.length - 1]).toEqual('KW30');
      expect(named.filter(label => label !== '').length).toBeLessThan(labels.length);
      // and never two names next to each other, which is what running out of room looked like
      expect(named.some((label, index) => label !== '' && named[index + 1] !== '' && index + 2 < named.length))
        .toBe(false);
    });
  });

  it('renders the chart canvas with data', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);

    fixture.detectChanges();

    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('writes out the sparkline scale', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);

    fixture.detectChanges();

    const scale = fixture.nativeElement.querySelector('[testid="panel-scale"]').textContent;
    expect(scale).toContain('Min 1');
    expect(scale).toContain('Max 3');
    expect(scale).toContain('Zuletzt 3');
  });

  it('appends the unit to the scale', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', {...detail, unit: 'kg'});

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="panel-scale"]').textContent).toContain('Min 1 kg');
  });

  it('has no scale without data points', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', {...detail, labels: [], dataPoints: []});

    fixture.detectChanges();

    expect(fixture.componentInstance.scale()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('[testid="panel-scale"]')).toBeNull();
  });

  it('shows the delta against the compared period', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);
    fixture.componentRef.setInput('comparison', {...detail, title: '40', value: 40});
    fixture.componentRef.setInput('comparisonLabel', 'ggü. Vorjahr');

    fixture.detectChanges();

    const delta = fixture.nativeElement.querySelector('[testid="panel-delta"]').textContent;
    expect(delta).toContain('+5');
    expect(delta).toContain('%');
    expect(delta).toContain('ggü. Vorjahr');
    expect(fixture.componentInstance.deltaLabel()).toEqual('5 % mehr ggü. Vorjahr');
  });

  it('reads out a decrease as such', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);
    fixture.componentRef.setInput('comparison', {...detail, title: '84', value: 84});
    fixture.componentRef.setInput('comparisonLabel', 'ggü. Vormonat');

    fixture.detectChanges();

    expect(fixture.componentInstance.deltaLabel()).toEqual('50 % weniger ggü. Vormonat');
  });

  it('has no delta without a compared period', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="panel-delta"]')).toBeNull();
  });

  it('shows a placeholder instead of the numbers while loading', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', detail);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('testId', 'statisticsPanel-test');

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="statisticsPanel-test-skeleton"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="panel-value"]')).toBeNull();
  });

  it('opens the enlarged chart with the shown and compared period', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({} as any);

    fixture.componentRef.setInput('data', detail);
    fixture.componentRef.setInput('comparison', {...detail, value: 40});
    fixture.componentRef.setInput('comparisonLabel', 'ggü. Vorjahr');
    fixture.componentRef.setInput('rangeLabel', '01.01.2026 - 12.08.2026');
    fixture.componentRef.setInput('comparisonRangeLabel', '01.01.2025 - 12.08.2025');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('mat-card').click();

    expect(openSpy).toHaveBeenCalledWith(StatisticsDetailDialogComponent, {
      width: '95vw',
      maxWidth: '42rem',
      data: {
        detail: detail,
        comparison: {...detail, value: 40},
        comparisonLabel: 'ggü. Vorjahr',
        rangeLabel: '01.01.2026 - 12.08.2026',
        comparisonRangeLabel: '01.01.2025 - 12.08.2025'
      }
    });
  });

  it('opens nothing while the shown period is being replaced', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({} as any);

    fixture.componentRef.setInput('data', detail);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('mat-card').click();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens nothing while there is no data yet', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({} as any);

    fixture.detectChanges();
    fixture.componentInstance.openDetails();

    expect(openSpy).not.toHaveBeenCalled();
  });

});
