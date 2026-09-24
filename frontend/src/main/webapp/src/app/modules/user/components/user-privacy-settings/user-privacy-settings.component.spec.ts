import type {MockedObject} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { UserPrivacySettingsComponent } from './user-privacy-settings.component';
import { UserApiService } from '../../../../api/user-api.service';
import { FileHelperService } from '../../../../common/util/file-helper.service';
import { TafelToastrService } from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserPrivacySettingsComponent', () => {
    let userApiService: MockedObject<UserApiService>;
    let fileHelperService: MockedObject<FileHelperService>;
    let toastrService: MockedObject<TafelToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: UserApiService,
                    useValue: {
                        exportUser: vi.fn().mockName('UserApiService.exportUser'),
                        generatePrivacyNoticeTemplate: vi.fn().mockName('UserApiService.generatePrivacyNoticeTemplate')
                    }
                },
                {
                    provide: FileHelperService,
                    useValue: {downloadFile: vi.fn().mockName('FileHelperService.downloadFile')}
                },
                {
                    provide: TafelToastrService,
                    useValue: {error: vi.fn().mockName('TafelToastrService.error')}
                }
            ]
        });

        userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
        toastrService = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    });

    function download(filename: string) {
        return new HttpResponse({
            status: 200,
            headers: new HttpHeaders({'Content-Disposition': `inline; filename=${filename}`}),
            body: new Blob()
        });
    }

    it('exports the caller\'s own data as a downloadable ZIP', () => {
        const response = download('benutzerdaten-mmuster.zip');
        userApiService.exportUser.mockReturnValueOnce(of(response));

        const fixture = TestBed.createComponent(UserPrivacySettingsComponent);
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('[testid="privacy-export-button"]') as HTMLElement).click();

        expect(fileHelperService.downloadFile).toHaveBeenCalledWith('benutzerdaten-mmuster.zip', response.body);
    });

    it('shows an error toast when the data export fails', () => {
        userApiService.exportUser.mockReturnValueOnce(throwError(() => new Error('failed')));

        const fixture = TestBed.createComponent(UserPrivacySettingsComponent);
        fixture.componentInstance.exportUserData();

        expect(fileHelperService.downloadFile).not.toHaveBeenCalled();
        expect(toastrService.error).toHaveBeenCalled();
    });

    it('downloads the staff privacy notice as a PDF', () => {
        const response = download('datenschutzerklaerung-mitarbeiter.pdf');
        userApiService.generatePrivacyNoticeTemplate.mockReturnValueOnce(of(response));

        const fixture = TestBed.createComponent(UserPrivacySettingsComponent);
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('[testid="privacy-notice-button"]') as HTMLElement).click();

        expect(fileHelperService.downloadFile).toHaveBeenCalledWith('datenschutzerklaerung-mitarbeiter.pdf', response.body);
    });

    it('shows an error toast when the staff privacy notice download fails', () => {
        userApiService.generatePrivacyNoticeTemplate.mockReturnValueOnce(throwError(() => new Error('failed')));

        const fixture = TestBed.createComponent(UserPrivacySettingsComponent);
        fixture.componentInstance.downloadStaffPrivacyNotice();

        expect(fileHelperService.downloadFile).not.toHaveBeenCalled();
        expect(toastrService.error).toHaveBeenCalled();
    });
});
