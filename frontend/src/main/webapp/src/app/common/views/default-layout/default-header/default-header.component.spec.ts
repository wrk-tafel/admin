import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { DefaultHeaderComponent } from './default-header.component';
import { AuthenticationService } from '../../../security/authentication.service';
import { of, Subject, throwError } from 'rxjs';
import { HttpHeaders, HttpResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GlobalStateService } from '../../../state/global-state.service';
import { signal } from '@angular/core';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { MatDialog } from '@angular/material/dialog';
import { SupportApiService, SupportClientContext } from '../../../../api/support-api.service';
import { UserApiService } from '../../../../api/user-api.service';
import { TafelToastrService } from '../../../components/tafel-toastr/tafel-toastr.service';
import { SupportContextService } from '../../../support/support-context.service';
import { ScreenshotService } from '../../../support/screenshot.service';
import { FileHelperService } from '../../../util/file-helper.service';
import { ConfigApiService } from '../../../../api/config-api.service';
import { DistributionItem } from '../../../../api/distribution-api.service';
import { TafelTitleStrategy } from '../../../util/tafel-title-strategy';

const screenshot = 'data:image/jpeg;base64,AAAA';

const clientContext: SupportClientContext = {
    screenshot,
    page: 'http://localhost/uebersicht',
    userAgent: 'Mozilla/5.0',
    viewport: '1280x800',
    screen: '1920x1080',
    language: 'de-AT',
    timeZone: 'Europe/Vienna',
    recentErrors: []
};

describe('DefaultHeaderComponent', () => {
    let authenticationService: MockedObject<AuthenticationService>;
    let globalStateService: MockedObject<GlobalStateService>;
    let supportApiService: MockedObject<SupportApiService>;
    let userApiService: MockedObject<UserApiService>;
    let fileHelperService: MockedObject<FileHelperService>;
    let toastrService: MockedObject<TafelToastrService>;
    let dialog: MockedObject<MatDialog>;
    let supportContextService: MockedObject<SupportContextService>;
    let screenshotService: MockedObject<ScreenshotService>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([{path: 'uebersicht', title: 'Übersicht', children: []}]),
                provideLocationMocks(),
                {provide: TitleStrategy, useExisting: TafelTitleStrategy},
                {
                    provide: AuthenticationService,
                    useValue: {
                        logout: vi.fn().mockName('AuthenticationService.logout'),
                        redirectToLogin: vi.fn().mockName('AuthenticationService.redirectToLogin')
                    }
                },
                {
                    provide: GlobalStateService,
                    useValue: {
                        getConnectionState: vi.fn().mockName('GlobalStateService.getConnectionState')
                          .mockReturnValue(signal(false).asReadonly()),
                        getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
                          .mockReturnValue(signal<DistributionItem | null>(null).asReadonly())
                    }
                },
                {
                    provide: ConfigApiService,
                    useValue: {
                        observeConfig: vi.fn().mockName('ConfigApiService.observeConfig')
                          .mockReturnValue(of({
                              version: '1.0.0', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true, environmentLabel: ''
                          }))
                    }
                },
                {
                    provide: SupportApiService,
                    useValue: {
                        createSupportRequest: vi.fn().mockName('SupportApiService.createSupportRequest')
                    }
                },
                {
                    provide: UserApiService,
                    useValue: {
                        exportUser: vi.fn().mockName('UserApiService.exportUser'),
                        generatePrivacyNoticeTemplate: vi.fn().mockName('UserApiService.generatePrivacyNoticeTemplate')
                    }
                },
                {
                    provide: FileHelperService,
                    useValue: {
                        downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success'),
                        error: vi.fn().mockName('TafelToastrService.error')
                    }
                },
                {
                    provide: MatDialog,
                    useValue: {
                        open: vi.fn().mockName('MatDialog.open')
                    }
                },
                {
                    provide: SupportContextService,
                    useValue: {
                        collect: vi.fn().mockName('SupportContextService.collect').mockReturnValue(clientContext)
                    }
                },
                {
                    provide: ScreenshotService,
                    useValue: {
                        capture: vi.fn().mockName('ScreenshotService.capture').mockResolvedValue(screenshot)
                    }
                }
            ]
        })
            .compileComponents();

        authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        supportApiService = TestBed.inject(SupportApiService) as MockedObject<SupportApiService>;
        userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
        toastrService = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
        dialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
        supportContextService = TestBed.inject(SupportContextService) as MockedObject<SupportContextService>;
        screenshotService = TestBed.inject(ScreenshotService) as MockedObject<ScreenshotService>;
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('on init starts listening to connection state', () => {
        globalStateService.getConnectionState.mockReturnValue(signal(true).asReadonly());

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.sseConnected()).toBe(true);
        expect(globalStateService.getConnectionState).toHaveBeenCalled();
    });

    it('states the connection state in the badge text, not only in its colour', () => {
        globalStateService.getConnectionState.mockReturnValue(signal(false).asReadonly());

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const badge: HTMLElement = fixture.nativeElement.querySelector('[testid="connection-state-badge"]');
        expect(badge.textContent!.trim()).toBe('Live-Verbindung unterbrochen');

        globalStateService.getConnectionState.mockReturnValue(signal(true).asReadonly());
        const connectedFixture = TestBed.createComponent(DefaultHeaderComponent);
        connectedFixture.detectChanges();

        const connectedBadge: HTMLElement = connectedFixture.nativeElement.querySelector('[testid="connection-state-badge"]');
        expect(connectedBadge.textContent!.trim()).toBe('Live-Verbindung besteht');
    });

    it('logout', () => {
        authenticationService.logout.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.logout();

        expect(authenticationService.logout).toHaveBeenCalled();
    });

    it('exports the caller\'s own data as a downloadable PDF', () => {
        const response = new HttpResponse({
            status: 200,
            headers: new HttpHeaders({'Content-Disposition': 'inline; filename=benutzerdaten-mmuster.pdf'}),
            body: new Blob()
        });
        userApiService.exportUser.mockReturnValueOnce(of(response));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.exportUserData();

        expect(fileHelperService.downloadFile).toHaveBeenCalledWith('benutzerdaten-mmuster.pdf', response.body);
    });

    it('shows an error toast when the data export fails', () => {
        userApiService.exportUser.mockReturnValueOnce(throwError(() => new Error('failed')));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.exportUserData();

        expect(fileHelperService.downloadFile).not.toHaveBeenCalled();
        expect(toastrService.error).toHaveBeenCalled();
    });

    it('downloads the staff privacy notice as a PDF', () => {
        const response = new HttpResponse({
            status: 200,
            headers: new HttpHeaders({'Content-Disposition': 'inline; filename=datenschutzerklaerung-mitarbeiter.pdf'}),
            body: new Blob()
        });
        userApiService.generatePrivacyNoticeTemplate.mockReturnValueOnce(of(response));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.downloadStaffPrivacyNotice();

        expect(fileHelperService.downloadFile).toHaveBeenCalledWith('datenschutzerklaerung-mitarbeiter.pdf', response.body);
    });

    it('shows an error toast when the staff privacy notice download fails', () => {
        userApiService.generatePrivacyNoticeTemplate.mockReturnValueOnce(throwError(() => new Error('failed')));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.downloadStaffPrivacyNotice();

        expect(fileHelperService.downloadFile).not.toHaveBeenCalled();
        expect(toastrService.error).toHaveBeenCalled();
    });

    it('open support dialog and submit sends the support request with the technical context', async () => {
        dialog.open.mockReturnValueOnce({
            afterClosed: () => of({title: 'Bug in login', text: 'Something is broken'})
        } as any);
        supportApiService.createSupportRequest.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        await component.openSupportDialog();

        // the screenshot is taken before the dialog opens, so the dialog is never in the picture
        expect(screenshotService.capture).toHaveBeenCalled();
        expect(supportContextService.collect).toHaveBeenCalledWith(screenshot);
        expect(supportApiService.createSupportRequest)
          .toHaveBeenCalledWith('Bug in login', 'Something is broken', clientContext);
        expect(toastrService.success).toHaveBeenCalled();
    });

    it('sends the request without a screenshot when none could be taken', async () => {
        screenshotService.capture.mockResolvedValueOnce(null);
        dialog.open.mockReturnValueOnce({
            afterClosed: () => of({title: 'Bug in login', text: 'Something is broken'})
        } as any);
        supportApiService.createSupportRequest.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        await component.openSupportDialog();

        expect(dialog.open).toHaveBeenCalled();
        expect(supportContextService.collect).toHaveBeenCalledWith(null);
        expect(supportApiService.createSupportRequest).toHaveBeenCalled();
    });

    it('Ctrl+K opens the quick-open dialog only once until it is closed again', () => {
        const afterClosed$ = new Subject<void>();
        dialog.open.mockReturnValue({afterClosed: () => afterClosed$.asObservable()} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const shortcut = () => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', ctrlKey: true, cancelable: true}));

        shortcut();
        expect(dialog.open).toHaveBeenCalledTimes(1);

        // while the dialog is open the shortcut must not stack a second instance on top
        shortcut();
        expect(dialog.open).toHaveBeenCalledTimes(1);

        afterClosed$.next();
        shortcut();
        expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('the shortcut is claimed from the browser via preventDefault', () => {
        const afterClosed$ = new Subject<void>();
        dialog.open.mockReturnValue({afterClosed: () => afterClosed$.asObservable()} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const event = new KeyboardEvent('keydown', {key: 'k', ctrlKey: true, cancelable: true});
        document.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    it('the toolbar button opens the quick-open dialog', () => {
        const afterClosed$ = new Subject<void>();
        dialog.open.mockReturnValue({afterClosed: () => afterClosed$.asObservable()} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('[testid="quickOpenButton"]');
        button.click();

        expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('open support dialog and cancel does not send anything', async () => {
        dialog.open.mockReturnValueOnce({afterClosed: () => of(undefined)} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        await component.openSupportDialog();

        expect(dialog.open).toHaveBeenCalled();
        expect(supportApiService.createSupportRequest).not.toHaveBeenCalled();
    });

    it('shows the distribution as closed and without a start time when none is active', () => {
        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const badge: HTMLElement = fixture.nativeElement.querySelector('[testid="distribution-state-badge"]');
        expect(badge.textContent!.trim()).toBe('Ausgabe geschlossen');
    });

    it('shows the distribution as open with its start time when one is active', () => {
        const distribution: DistributionItem = {id: 1, startedAt: new Date('2026-08-13T07:15:00')};
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(distribution).asReadonly());

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const badge: HTMLElement = fixture.nativeElement.querySelector('[testid="distribution-state-badge"]');
        // collapses the incidental inter-element whitespace Angular's template renders, not the
        // content itself
        expect(badge.textContent!.replace(/\s+/g, ' ').trim()).toBe('Ausgabe geöffnet · 07:15');
    });

    it('does not treat an already-closed distribution as active', () => {
        const distribution: DistributionItem = {
            id: 1, startedAt: new Date('2026-08-13T07:15:00'), endedAt: new Date('2026-08-13T12:00:00')
        };
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(distribution).asReadonly());

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const badge: HTMLElement = fixture.nativeElement.querySelector('[testid="distribution-state-badge"]');
        expect(badge.textContent!.trim()).toBe('Ausgabe geschlossen');
    });

    it('shows no environment banner on production, where the label is empty', () => {
        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[testid="environment-banner"]')).toBeFalsy();
    });

    it('shows an environment banner outside production', () => {
        const configApiService = TestBed.inject(ConfigApiService) as MockedObject<ConfigApiService>;
        configApiService.observeConfig.mockReturnValue(
            of({version: '1.0.0', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true, environmentLabel: 'DEV'})
        );

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        const banner: HTMLElement = fixture.nativeElement.querySelector('[testid="environment-banner"]');
        expect(banner.textContent!.trim()).toBe('DEV-Umgebung');
    });

    // Shown on every viewport; on mobile it is even the only visible indication of the open page,
    // since the sidebar starts closed there.
    it('shows the active route title in the header, hidden from a screen reader that already has the real h1', async () => {
        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        fixture.detectChanges();

        await TestBed.inject(Router).navigate(['/uebersicht']);
        fixture.detectChanges();

        const title: HTMLElement = fixture.nativeElement.querySelector('[testid="page-title"]');
        expect(title.textContent!.trim()).toBe('Übersicht');
        expect(title.getAttribute('aria-hidden')).toBe('true');
    });

});
