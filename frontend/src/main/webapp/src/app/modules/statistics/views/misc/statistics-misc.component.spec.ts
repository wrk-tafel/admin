import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {StatisticsMiscComponent} from './statistics-misc.component';

describe('StatisticsMiscComponent', () => {

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsMiscComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
