import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of} from 'rxjs';
import {SettingsEmailComponent} from './settings-email.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MailTypeEnum, SettingsApiService} from '../../../../api/settings-api.service';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {MailRecipientsComponent} from '../../components/mail-recipients/mail-recipients.component';

describe('SettingsEmailComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: TafelToastrService,
          useValue: {error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn()}
        },
        {
          provide: SettingsApiService,
          useValue: {
            getMailRecipients: vi.fn().mockReturnValue(of({mailRecipients: []})),
            saveMailRecipients: vi.fn(),
            getMailStatus: vi.fn().mockReturnValue(of({
              mailStatus: Object.values(MailTypeEnum).map(mailType => ({
                mailType, status: null, queuedAt: null, sentAt: null, lastError: null
              }))
            }))
          }
        },
        {
          provide: DistributionApiService,
          useValue: {
            getDistributions: vi.fn().mockReturnValue(of({items: []})),
            sendMails: vi.fn()
          }
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

  it('answers the unsaved-changes guard from the recipients card', () => {
    const fixture = TestBed.createComponent(SettingsEmailComponent);
    fixture.detectChanges();
    const recipients = fixture.debugElement.query(el => el.name === 'tafel-mail-recipients')
      .componentInstance as MailRecipientsComponent;

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    vi.spyOn(recipients, 'hasUnsavedChanges').mockReturnValue(true);

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('re-reads the delivery status after a resend', () => {
    const fixture = TestBed.createComponent(SettingsEmailComponent);
    fixture.detectChanges();
    const recipients = fixture.debugElement.query(el => el.name === 'tafel-mail-recipients')
      .componentInstance as MailRecipientsComponent;
    const reload = vi.spyOn(recipients, 'reloadMailStatus');

    fixture.componentInstance['onMailsSent']();

    expect(reload).toHaveBeenCalled();
  });

});
