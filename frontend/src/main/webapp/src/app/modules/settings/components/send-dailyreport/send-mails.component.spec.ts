import {TestBed, waitForAsync} from '@angular/core/testing';
import {SendMailsComponent} from './send-mails.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('SendMailsComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // TODO add tests

});
