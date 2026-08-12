import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {SendMailsComponent} from './send-mails.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {MailRecipients, MailTypeEnum, RecipientTypeEnum, SettingsApiService} from '../../../../api/settings-api.service';
import {of, throwError} from 'rxjs';
import {SendMailsDialogComponent} from './dialogs/send-mails-dialog.component';

describe('SendMailsComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let settingsApiService: MockedObject<SettingsApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let dialogMock: Partial<MatDialog>;
  let dialogResult: boolean | undefined;

  const testDistributions: DistributionItem[] = [
    {id: 1, startedAt: new Date('2026-01-01')},
    {id: 2, startedAt: new Date('2026-02-01')}
  ];

  const testRecipients: MailRecipients = {
    mailRecipients: [
      {
        mailType: MailTypeEnum.DAILY_REPORT,
        recipients: [
          {recipientType: RecipientTypeEnum.TO, addresses: ['to1@test.com', 'to2@test.com']},
          {recipientType: RecipientTypeEnum.CC, addresses: ['cc1@test.com']}
        ]
      }
    ]
  };

  beforeEach(() => {
    dialogResult = true;

    dialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(dialogResult)}) as never)
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: DistributionApiService,
          useValue: {
            getDistributions: vi.fn().mockName('DistributionApiService.getDistributions').mockReturnValue(of({items: []})),
            sendMails: vi.fn().mockName('DistributionApiService.sendMails').mockReturnValue(of({queuedMails: 3}))
          }
        },
        {
          provide: SettingsApiService,
          useValue: {
            getMailRecipients: vi.fn().mockName('SettingsApiService.getMailRecipients').mockReturnValue(of(testRecipients))
          }
        },
        {provide: TafelToastrService, useValue: {error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn()}},
        {provide: MatDialog, useValue: dialogMock}
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    settingsApiService = TestBed.inject(SettingsApiService) as MockedObject<SettingsApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  function createComponent() {
    const fixture = TestBed.createComponent(SendMailsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('component can be created', () => {
    expect(createComponent()).toBeTruthy();
  });

  it('loads distributions and preselects the first one', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));

    const component = createComponent();

    expect(component.distributions()).toEqual(testDistributions);
    expect(component.selectedDistribution()).toEqual(testDistributions[0]);
  });

  it('leaves selectedDistribution unset when there are no distributions', () => {
    const component = createComponent();

    expect(component.distributions()).toEqual([]);
    expect(component.selectedDistribution()).toBeNull();
  });

  it('does nothing when no distribution is selected', () => {
    const component = createComponent();

    component['confirmSendMails']();

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(distributionApiService.sendMails).not.toHaveBeenCalled();
  });

  it('confirms with the distribution date and the TO addresses of every mail type', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));

    const component = createComponent();
    component['confirmSendMails']();

    expect(settingsApiService.getMailRecipients).toHaveBeenCalled();
    expect(dialogMock.open).toHaveBeenCalledWith(SendMailsDialogComponent, {
      width: '600px',
      data: {
        distributionDate: '01.01.2026',
        mailTypes: [
          {mailType: MailTypeEnum.DAILY_REPORT, label: 'Tagesreport', recipients: ['to1@test.com', 'to2@test.com']},
          {mailType: MailTypeEnum.STATISTICS, label: 'Statistiken', recipients: []},
          {mailType: MailTypeEnum.RETURN_BOXES, label: 'Retourkisten', recipients: []}
        ]
      }
    });
  });

  it('sends the mails and reports how many were queued', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));

    const component = createComponent();
    const mailsSent = vi.fn();
    component.mailsSent.subscribe(mailsSent);

    component['confirmSendMails']();

    expect(distributionApiService.sendMails).toHaveBeenCalledWith(testDistributions[0].id);
    expect(toastr.success).toHaveBeenCalledWith('3 E-Mails wurden zum Versand eingereiht!');
    expect(mailsSent).toHaveBeenCalled();
  });

  it('uses the singular for a single queued mail', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(of({queuedMails: 1}));

    const component = createComponent();
    component['confirmSendMails']();

    expect(toastr.success).toHaveBeenCalledWith('1 E-Mail wurde zum Versand eingereiht!');
  });

  it('warns instead of celebrating when nothing was queued at all', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(of({queuedMails: 0}));

    const component = createComponent();
    component['confirmSendMails']();

    expect(toastr.success).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalledWith(
      'Es wurde keine E-Mail eingereiht — es sind keine Empfänger hinterlegt oder es ist kein Mailserver konfiguriert.'
    );
  });

  it('sends nothing when the confirmation is cancelled', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    dialogResult = false;

    const component = createComponent();
    component['confirmSendMails']();

    expect(distributionApiService.sendMails).not.toHaveBeenCalled();
  });

  it('shows an error toast when sending fails', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(throwError(() => new Error('failed')));

    const component = createComponent();
    component['confirmSendMails']();

    expect(toastr.error).toHaveBeenCalledWith('Senden der E-Mails fehlgeschlagen!');
  });

  it('shows an error toast when the recipients for the confirmation cannot be read', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    settingsApiService.getMailRecipients.mockReturnValue(throwError(() => new Error('failed')));

    const component = createComponent();
    component['confirmSendMails']();

    expect(toastr.error).toHaveBeenCalledWith('Empfänger konnten nicht geladen werden!', 'Fehler');
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('uses the currently selected distribution after it is changed', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));

    const component = createComponent();
    component.selectedDistribution.set(testDistributions[1]);
    component['confirmSendMails']();

    expect(distributionApiService.sendMails).toHaveBeenCalledWith(testDistributions[1].id);
  });

});
