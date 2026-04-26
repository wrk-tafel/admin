import {TestBed} from '@angular/core/testing';
import {SendMailsComponent} from './send-mails.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';

describe('SendMailsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() } }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // TODO add tests

});
