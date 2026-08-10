import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { DefaultHeaderComponent } from './default-header.component';
import { AuthenticationService } from '../../../security/authentication.service';
import { of } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GlobalStateService } from '../../../state/global-state.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { MatDialog } from '@angular/material/dialog';
import { SupportApiService, SupportClientContext } from '../../../../api/support-api.service';
import { TafelToastrService } from '../../../components/tafel-toastr/tafel-toastr.service';
import { SupportContextService } from '../../../support/support-context.service';
import { ScreenshotService } from '../../../support/screenshot.service';

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
    let toastrService: MockedObject<TafelToastrService>;
    let dialog: MockedObject<MatDialog>;
    let supportContextService: MockedObject<SupportContextService>;
    let screenshotService: MockedObject<ScreenshotService>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideLocationMocks(),
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
                          .mockReturnValue(signal(false).asReadonly())
                    }
                },
                {
                    provide: SupportApiService,
                    useValue: {
                        createSupportRequest: vi.fn().mockName('SupportApiService.createSupportRequest')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success')
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

        const badge: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
        expect(badge.textContent!.trim()).toBe('Live-Verbindung unterbrochen');

        globalStateService.getConnectionState.mockReturnValue(signal(true).asReadonly());
        const connectedFixture = TestBed.createComponent(DefaultHeaderComponent);
        connectedFixture.detectChanges();

        const connectedBadge: HTMLElement = connectedFixture.nativeElement.querySelector('[role="status"]');
        expect(connectedBadge.textContent!.trim()).toBe('Live-Verbindung besteht');
    });

    it('logout', () => {
        authenticationService.logout.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.logout();

        expect(authenticationService.logout).toHaveBeenCalled();
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
        expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {data: {screenshot}});
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

        expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {data: {screenshot: null}});
        expect(supportContextService.collect).toHaveBeenCalledWith(null);
        expect(supportApiService.createSupportRequest).toHaveBeenCalled();
    });

    it('open support dialog and cancel does not send anything', async () => {
        dialog.open.mockReturnValueOnce({afterClosed: () => of(undefined)} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        await component.openSupportDialog();

        expect(dialog.open).toHaveBeenCalled();
        expect(supportApiService.createSupportRequest).not.toHaveBeenCalled();
    });

});
