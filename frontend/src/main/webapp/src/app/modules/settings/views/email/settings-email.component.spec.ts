import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ToastrService} from 'ngx-toastr';
import {SettingsEmailComponent} from './settings-email.component';

describe('SettingsEmailComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ToastrService,
          useValue: {error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn()}
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsEmailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('renders mail recipients and send mails components', () => {
    const fixture = TestBed.createComponent(SettingsEmailComponent);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;

    const mailRecipients = native.querySelector('tafel-mail-recipients');
    const sendMails = native.querySelector('tafel-send-mails');

    expect(mailRecipients).toBeTruthy();
    expect(sendMails).toBeTruthy();
  });

});
