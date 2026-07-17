import {TestBed} from '@angular/core/testing';
import {StatisticsPanelComponent} from './statistics-panel.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';

describe('StatisticsComponent', () => {

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

  it('renders the chart canvas with data', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    fixture.componentRef.setInput('data', {
      title: '42',
      subTitle: 'Test Subtitle',
      labels: ['a', 'b', 'c'],
      dataPoints: [1, 2, 3]
    });

    fixture.detectChanges();

    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

});
