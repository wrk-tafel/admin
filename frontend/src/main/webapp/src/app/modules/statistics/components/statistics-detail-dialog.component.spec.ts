import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {StatisticsDetailDialogComponent, StatisticsDetailDialogData} from './statistics-detail-dialog.component';

describe('StatisticsDetailDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<StatisticsDetailDialogComponent>>;

  const dialogData: StatisticsDetailDialogData = {
    detail: {
      title: '30',
      subTitle: 'Bezugsberechtigte Haushalte',
      value: 30,
      labels: ['Jänner', 'Februar', 'März'],
      dataPoints: [10, 20, 30]
    },
    comparison: {
      title: '20',
      subTitle: 'Bezugsberechtigte Haushalte',
      value: 20,
      labels: ['Jänner', 'Februar', 'März'],
      dataPoints: [5, 10, 20]
    },
    comparisonLabel: 'ggü. Vorjahr',
    rangeLabel: '01.01.2026 - 31.03.2026',
    comparisonRangeLabel: '01.01.2025 - 31.03.2025'
  };

  function configure(data: StatisticsDetailDialogData) {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideCharts(withDefaultRegisterables()),
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  }

  it('shows the key figure, its period and the delta', () => {
    configure(dialogData);
    const fixture = TestBed.createComponent(StatisticsDetailDialogComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement;
    expect(element.querySelector('[testid="statistics-detail-value"]').textContent).toContain('30');
    expect(element.querySelector('[testid="statistics-detail-range"]').textContent).toContain('01.01.2026 - 31.03.2026');
    expect(element.querySelector('[testid="statistics-detail-delta"]').textContent).toContain('+50');
    expect(element.querySelector('[testid="statistics-detail-delta"]').textContent).toContain('ggü. Vorjahr');
  });

  it('summarizes the course of the whole period', () => {
    configure(dialogData);
    const fixture = TestBed.createComponent(StatisticsDetailDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()).toEqual({minimum: 10, maximum: 30, average: 20});
    expect(fixture.componentInstance.chartLabel())
      .toEqual('Bezugsberechtigte Haushalte im Zeitverlauf - Jänner: 10, Februar: 20, März: 30');
    expect(fixture.nativeElement.querySelector('[testid="statistics-detail-chart"]')).toBeTruthy();
  });

  it('says so when the period holds no data points', () => {
    configure({
      ...dialogData,
      detail: {...dialogData.detail, labels: [], dataPoints: []},
      comparison: undefined,
      comparisonRangeLabel: undefined
    });
    const fixture = TestBed.createComponent(StatisticsDetailDialogComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('[testid="statistics-detail-empty"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid="statistics-detail-delta"]')).toBeNull();
  });

});
