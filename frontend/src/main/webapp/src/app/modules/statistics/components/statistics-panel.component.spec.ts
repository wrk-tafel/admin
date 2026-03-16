import {TestBed} from '@angular/core/testing';
import {StatisticsPanelComponent} from './statistics-panel.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('StatisticsComponent', () => {

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsPanelComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
