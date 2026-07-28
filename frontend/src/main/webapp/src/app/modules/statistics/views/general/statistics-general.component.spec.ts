import {TestBed} from '@angular/core/testing';
import {StatisticsGeneralComponent} from './statistics-general.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('StatisticsGeneralComponent', () => {

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(StatisticsGeneralComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
