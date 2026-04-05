import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MailRecipientsComponent } from './mail-recipients.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { MailRecipients, MailTypeEnum, RecipientTypeEnum, SettingsApiService } from '../../../../api/settings-api.service';
import { ToastrService } from 'ngx-toastr';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('MailRecipients', () => {
    let apiService: MockedObject<SettingsApiService>;
    let toastr: MockedObject<ToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule,
                NoopAnimationsModule
            ],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: SettingsApiService,
                    useValue: {
                        getMailRecipients: vi.fn().mockName("SettingsApiService.getMailRecipients"),
                        saveMailRecipients: vi.fn().mockName("SettingsApiService.saveMailRecipients")
                    }
                },
                {
                    provide: ToastrService,
                    useValue: {
                        error: vi.fn().mockName("ToastrService.error"),
                        info: vi.fn().mockName("ToastrService.info"),
                        success: vi.fn().mockName("ToastrService.success"),
                        warning: vi.fn().mockName("ToastrService.warning")
                    }
                }
            ]
        }).compileComponents();

        apiService = TestBed.inject(SettingsApiService) as MockedObject<SettingsApiService>;
        toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
    });

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
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('save successful', () => {
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        apiService.getMailRecipients.mockReturnValue(of(testData));
        apiService.saveMailRecipients.mockReturnValue(of(undefined));
        vi.spyOn(component.form, 'valid', 'get').mockReturnValue(true);
        vi.spyOn(component.form, 'getRawValue').mockReturnValue(testData);
        const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');

        fixture.detectChanges(); // Trigger effect in constructor
        component.save();

        expect(markAllAsTouchedSpy).toHaveBeenCalled();
        expect(apiService.saveMailRecipients).toHaveBeenCalledWith(testData);
        expect(toastr.success).toHaveBeenCalledWith('Einstellungen gespeichert!');
    });

    it('save failed due to an invalid form', () => {
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        apiService.getMailRecipients.mockReturnValue(of(testData));
        vi.spyOn(component.form, 'valid', 'get').mockReturnValue(false);
        const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');

        fixture.detectChanges(); // Trigger effect in constructor
        component.save();

        expect(markAllAsTouchedSpy).toHaveBeenCalled();
        expect(apiService.saveMailRecipients).not.toHaveBeenCalled();
    });

    it('save failed due to a request error', () => {
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        apiService.getMailRecipients.mockReturnValue(of(testData));
        apiService.saveMailRecipients.mockReturnValue(throwError(() => new Error('Save failed')));
        vi.spyOn(component.form, 'valid', 'get').mockReturnValue(true);
        const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');

        fixture.detectChanges(); // Trigger effect in constructor
        component.save();

        expect(markAllAsTouchedSpy).toHaveBeenCalled();
        expect(apiService.saveMailRecipients).toHaveBeenCalled();
        expect(toastr.error).toHaveBeenCalledWith('Speichern fehlgeschlagen!');
    });

    it('add address', () => {
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        apiService.getMailRecipients.mockReturnValue(of(testData));
        fixture.detectChanges(); // Trigger effect in constructor

        expect(component.getAddressesOfRecipientTypeIndex(1, 0).length).toBe(0);

        component.addAddress(1, 0);

        expect(component.getAddressesOfRecipientTypeIndex(1, 0).length).toBe(1);
    });

    it('remove address', () => {
        const fixture = TestBed.createComponent(MailRecipientsComponent);
        const component = fixture.componentInstance;
        apiService.getMailRecipients.mockReturnValue(of(testData));
        fixture.detectChanges(); // Trigger effect in constructor

        expect(component.getAddressesOfRecipientTypeIndex(0, 0).length).toBe(1);

        component.removeAddress(0, 0, 0);

        expect(component.getAddressesOfRecipientTypeIndex(0, 0).length).toBe(0);
    });

});
