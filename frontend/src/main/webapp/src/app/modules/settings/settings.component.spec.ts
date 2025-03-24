import {TestBed, waitForAsync} from '@angular/core/testing';
import {SettingsComponent} from './settings.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MailRecipients, MailTypeEnum, RecipientTypeEnum, SettingsApiService} from '../../api/settings-api.service';
import {of, throwError} from 'rxjs';
import {ToastService, ToastType} from '../../common/components/toasts/toast.service';
import {ReactiveFormsModule} from '@angular/forms';

describe('SettingsComponent', () => {
  let apiService: jasmine.SpyObj<SettingsApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SettingsApiService,
          useValue: jasmine.createSpyObj('SettingsApiService', ['getMailRecipients', 'saveMailRecipients'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(SettingsApiService) as jasmine.SpyObj<SettingsApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

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

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('save successful', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    apiService.getMailRecipients.and.returnValue(of(testData));
    apiService.saveMailRecipients.and.returnValue(of(undefined));
    spyOnProperty(component.form, 'valid').and.returnValue(true);
    spyOn(component.form, 'getRawValue').and.returnValue(testData);
    const markAllAsTouchedSpy = spyOn(component.form, 'markAllAsTouched');

    component.ngOnInit();
    component.save();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(apiService.saveMailRecipients).toHaveBeenCalledWith(testData);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.SUCCESS, title: 'Einstellungen gespeichert!'});
  });

  it('save failed due to an invalid form', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    apiService.getMailRecipients.and.returnValue(of(testData));
    spyOnProperty(component.form, 'valid').and.returnValue(false);
    const markAllAsTouchedSpy = spyOn(component.form, 'markAllAsTouched');

    component.ngOnInit();
    component.save();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(apiService.saveMailRecipients).not.toHaveBeenCalled();
  });

  it('save failed due to a request error', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    apiService.getMailRecipients.and.returnValue(of(testData));
    apiService.saveMailRecipients.and.returnValue(throwError(() => new Error('Save failed')));
    spyOnProperty(component.form, 'valid').and.returnValue(true);
    const markAllAsTouchedSpy = spyOn(component.form, 'markAllAsTouched');

    component.ngOnInit();
    component.save();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(apiService.saveMailRecipients).toHaveBeenCalled();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

  it('add address', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    apiService.getMailRecipients.and.returnValue(of(testData));
    component.ngOnInit();

    expect(component.getAddressesOfRecipientTypeIndex(1, 0).length).toBe(0);

    component.addAddress(1, 0);

    expect(component.getAddressesOfRecipientTypeIndex(1, 0).length).toBe(1);
  });

  it('remove address', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    apiService.getMailRecipients.and.returnValue(of(testData));
    component.ngOnInit();

    expect(component.getAddressesOfRecipientTypeIndex(0, 0).length).toBe(1);

    component.removeAddress(0, 0, 0);

    expect(component.getAddressesOfRecipientTypeIndex(0, 0).length).toBe(0);
  });

});
