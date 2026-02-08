import {TestBed, waitForAsync} from '@angular/core/testing';
import {StatisticsComponent} from './statistics.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('StatisticsComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
