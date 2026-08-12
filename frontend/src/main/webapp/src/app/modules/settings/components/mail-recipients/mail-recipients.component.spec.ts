import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatChipInputEvent} from '@angular/material/chips';
import {MailRecipientsComponent} from './mail-recipients.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of, throwError} from 'rxjs';
import {
  MailOutboxStatusEnum,
  MailRecipients,
  MailStatusListResponse,
  MailTypeEnum,
  RecipientTypeEnum,
  SettingsApiService
} from '../../../../api/settings-api.service';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('MailRecipients', () => {
  let apiService: MockedObject<SettingsApiService>;
  let toastr: MockedObject<TafelToastrService>;

  const testData: MailRecipients = {
    mailRecipients: [
      {
        mailType: MailTypeEnum.DAILY_REPORT,
        recipients: [
          {
            recipientType: RecipientTypeEnum.TO,
            addresses: ['to1@test.com']
          }
        ]
      },
      {
        mailType: MailTypeEnum.STATISTICS,
        recipients: [
          {
            recipientType: RecipientTypeEnum.BCC,
            addresses: ['bcc1@test.com']
          }
        ]
      }
    ]
  };

  const emptyStatus: MailStatusListResponse = {
    mailStatus: Object.values(MailTypeEnum).map(mailType => ({
      mailType,
      status: null,
      queuedAt: null,
      sentAt: null,
      lastError: null
    }))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: SettingsApiService,
          useValue: {
            getMailRecipients: vi.fn().mockName('SettingsApiService.getMailRecipients').mockReturnValue(of(testData)),
            saveMailRecipients: vi.fn().mockName('SettingsApiService.saveMailRecipients'),
            getMailStatus: vi.fn().mockName('SettingsApiService.getMailStatus').mockReturnValue(of(emptyStatus))
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            info: vi.fn().mockName('TafelToastrService.info'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(SettingsApiService) as MockedObject<SettingsApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  function createComponent() {
    const fixture = TestBed.createComponent(MailRecipientsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function chipInputEvent(value: string): MatChipInputEvent {
    return {value, chipInput: {clear: vi.fn()}} as unknown as MatChipInputEvent;
  }

  function tabOf(component: MailRecipientsComponent, mailType: MailTypeEnum) {
    return component['tabs']().find(tab => tab.mailType === mailType)!;
  }

  function addressesOf(component: MailRecipientsComponent, mailType: MailTypeEnum, recipientType: RecipientTypeEnum) {
    return tabOf(component, mailType).slots.find(slot => slot.recipientType === recipientType)!.addresses;
  }

  it('component can be created', () => {
    expect(createComponent()).toBeTruthy();
  });

  it('renders every mail type with all three recipient slots', () => {
    const component = createComponent();

    expect(component['tabs']().map(tab => tab.mailType))
      .toEqual([MailTypeEnum.DAILY_REPORT, MailTypeEnum.STATISTICS, MailTypeEnum.RETURN_BOXES]);
    expect(tabOf(component, MailTypeEnum.DAILY_REPORT).slots.map(slot => slot.recipientType))
      .toEqual([RecipientTypeEnum.TO, RecipientTypeEnum.CC, RecipientTypeEnum.BCC]);
    expect(addressesOf(component, MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO).map(address => address.address))
      .toEqual(['to1@test.com']);
  });

  it('flags a mail type that has no TO address at all', () => {
    const component = createComponent();

    expect(tabOf(component, MailTypeEnum.DAILY_REPORT).hasNoRecipients).toBe(false);
    // only a BCC address is configured, so nothing is actually delivered
    expect(tabOf(component, MailTypeEnum.STATISTICS).hasNoRecipients).toBe(true);
    expect(tabOf(component, MailTypeEnum.RETURN_BOXES).hasNoRecipients).toBe(true);
  });

  it('flags a stored address that is not a valid mail address', () => {
    apiService.getMailRecipients.mockReturnValue(of({
      mailRecipients: [{
        mailType: MailTypeEnum.DAILY_REPORT,
        recipients: [{recipientType: RecipientTypeEnum.TO, addresses: ['kaputt']}]
      }]
    }));

    const component = createComponent();

    expect(tabOf(component, MailTypeEnum.DAILY_REPORT).hasInvalidAddress).toBe(true);
    expect(addressesOf(component, MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO)[0].valid).toBe(false);
  });

  it('adds a typed address as a chip', () => {
    const component = createComponent();
    const event = chipInputEvent('new@test.com');

    component['addAddress'](event, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);

    expect(addressesOf(component, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC).map(address => address.address))
      .toEqual(['new@test.com']);
    expect(event.chipInput.clear).toHaveBeenCalled();
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('rejects an invalid address instead of adding it, and keeps the input for correction', () => {
    const component = createComponent();
    const event = chipInputEvent('kein-mail');

    component['addAddress'](event, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);

    expect(addressesOf(component, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC)).toEqual([]);
    expect(component['inputError'](MailTypeEnum.STATISTICS, RecipientTypeEnum.CC)).toBe('Ungültige E-Mail Adresse');
    expect(event.chipInput.clear).not.toHaveBeenCalled();
  });

  it('rejects an address that is already in the same slot', () => {
    const component = createComponent();

    component['addAddress'](chipInputEvent('TO1@test.com'), MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO);

    expect(addressesOf(component, MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO).length).toBe(1);
    expect(component['inputError'](MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO))
      .toBe('Diese Adresse ist bereits hinterlegt');
  });

  it('ignores an empty input', () => {
    const component = createComponent();
    const event = chipInputEvent('   ');

    component['addAddress'](event, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);

    expect(addressesOf(component, MailTypeEnum.STATISTICS, RecipientTypeEnum.CC)).toEqual([]);
    expect(event.chipInput.clear).toHaveBeenCalled();
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('removes an address', () => {
    const component = createComponent();

    component['removeAddress'](MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO, 'to1@test.com');

    expect(addressesOf(component, MailTypeEnum.DAILY_REPORT, RecipientTypeEnum.TO)).toEqual([]);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('reports no unsaved changes once an edit is undone again', () => {
    const component = createComponent();

    component['addAddress'](chipInputEvent('new@test.com'), MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);
    expect(component.hasUnsavedChanges()).toBe(true);

    component['removeAddress'](MailTypeEnum.STATISTICS, RecipientTypeEnum.CC, 'new@test.com');
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('saves every mail type with all its slots and clears the unsaved marker', () => {
    apiService.saveMailRecipients.mockReturnValue(of(undefined));
    const component = createComponent();

    component['addAddress'](chipInputEvent('new@test.com'), MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);
    component['save']();

    expect(apiService.saveMailRecipients).toHaveBeenCalledWith({
      mailRecipients: [
        {
          mailType: MailTypeEnum.DAILY_REPORT,
          recipients: [
            {recipientType: RecipientTypeEnum.TO, addresses: ['to1@test.com']},
            {recipientType: RecipientTypeEnum.CC, addresses: []},
            {recipientType: RecipientTypeEnum.BCC, addresses: []}
          ]
        },
        {
          mailType: MailTypeEnum.STATISTICS,
          recipients: [
            {recipientType: RecipientTypeEnum.TO, addresses: []},
            {recipientType: RecipientTypeEnum.CC, addresses: ['new@test.com']},
            {recipientType: RecipientTypeEnum.BCC, addresses: ['bcc1@test.com']}
          ]
        },
        {
          mailType: MailTypeEnum.RETURN_BOXES,
          recipients: [
            {recipientType: RecipientTypeEnum.TO, addresses: []},
            {recipientType: RecipientTypeEnum.CC, addresses: []},
            {recipientType: RecipientTypeEnum.BCC, addresses: []}
          ]
        }
      ]
    });
    expect(toastr.success).toHaveBeenCalledWith('Einstellungen gespeichert!');
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('keeps the unsaved marker when saving fails', () => {
    apiService.saveMailRecipients.mockReturnValue(throwError(() => new Error('Save failed')));
    const component = createComponent();

    component['addAddress'](chipInputEvent('new@test.com'), MailTypeEnum.STATISTICS, RecipientTypeEnum.CC);
    component['save']();

    expect(toastr.error).toHaveBeenCalledWith('Speichern fehlgeschlagen!');
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('reports an error when the recipients cannot be loaded', () => {
    apiService.getMailRecipients.mockReturnValue(throwError(() => new Error('load failed')));

    createComponent();

    expect(toastr.error).toHaveBeenCalledWith('Empfänger konnten nicht geladen werden!', 'Fehler');
  });

  it('shows how the last mail of each type ended', () => {
    apiService.getMailStatus.mockReturnValue(of({
      mailStatus: [
        {
          mailType: MailTypeEnum.DAILY_REPORT,
          status: MailOutboxStatusEnum.SENT,
          queuedAt: '2026-08-11T18:00:00',
          sentAt: '2026-08-11T18:00:10',
          lastError: null
        },
        {
          mailType: MailTypeEnum.STATISTICS,
          status: MailOutboxStatusEnum.FAILED,
          queuedAt: '2026-08-11T18:00:00',
          sentAt: null,
          lastError: 'MailSendException: connection refused'
        },
        {
          mailType: MailTypeEnum.RETURN_BOXES,
          status: MailOutboxStatusEnum.PENDING,
          queuedAt: '2026-08-11T18:00:00',
          sentAt: null,
          lastError: null
        }
      ]
    }));

    const component = createComponent();

    expect(component['statusOf'](MailTypeEnum.DAILY_REPORT))
      .toEqual({text: 'Zuletzt versendet', severity: 'success'});
    expect(component['statusOf'](MailTypeEnum.STATISTICS))
      .toEqual({text: 'Versand endgültig fehlgeschlagen', severity: 'danger'});
    expect(component['statusOf'](MailTypeEnum.RETURN_BOXES))
      .toEqual({text: 'Wartet auf Versand seit', severity: 'info'});
    expect(component['statusItemOf'](MailTypeEnum.STATISTICS)?.lastError)
      .toBe('MailSendException: connection refused');
  });

  it('tells a mail that is being retried apart from one that is simply waiting', () => {
    apiService.getMailStatus.mockReturnValue(of({
      mailStatus: [{
        mailType: MailTypeEnum.DAILY_REPORT,
        status: MailOutboxStatusEnum.PENDING,
        queuedAt: '2026-08-11T18:00:00',
        sentAt: null,
        lastError: 'MailAuthenticationException: Authentication failed'
      }]
    }));

    const component = createComponent();

    expect(component['statusOf'](MailTypeEnum.DAILY_REPORT))
      .toEqual({text: 'Versand fehlgeschlagen, wird erneut versucht — eingereiht', severity: 'warning'});
  });

  it('says so when no mail of a type was ever queued', () => {
    const component = createComponent();

    expect(component['statusOf'](MailTypeEnum.DAILY_REPORT))
      .toEqual({text: 'Bisher wurde keine Mail dieser Art versendet.', severity: 'unknown'});
  });

  it('re-reads the status on request, without disturbing the recipients', () => {
    const component = createComponent();

    component.reloadMailStatus();

    expect(apiService.getMailStatus).toHaveBeenCalledTimes(2);
    expect(apiService.getMailRecipients).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when only the status cannot be read', () => {
    apiService.getMailStatus.mockReturnValue(throwError(() => new Error('status failed')));

    const component = createComponent();

    expect(toastr.error).not.toHaveBeenCalled();
    expect(component['statusOf'](MailTypeEnum.DAILY_REPORT)).toBeNull();
  });

});
