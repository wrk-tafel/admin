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
import { SupportApiService } from '../../../../api/support-api.service';
import { TafelToastrService } from '../../../components/tafel-toastr/tafel-toastr.service';

describe('DefaultHeaderComponent', () => {
    let authenticationService: MockedObject<AuthenticationService>;
    let globalStateService: MockedObject<GlobalStateService>;
    let supportApiService: MockedObject<SupportApiService>;
    let toastrService: MockedObject<TafelToastrService>;
    let dialog: MockedObject<MatDialog>;

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
                }
            ]
        })
            .compileComponents();

        authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        supportApiService = TestBed.inject(SupportApiService) as MockedObject<SupportApiService>;
        toastrService = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
        dialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
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

    it('logout', () => {
        authenticationService.logout.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.logout();

        expect(authenticationService.logout).toHaveBeenCalled();
    });

    it('open support dialog and submit sends the support request', () => {
        dialog.open.mockReturnValueOnce({afterClosed: () => of({title: 'Bug in login', text: 'Something is broken'})} as any);
        supportApiService.createSupportRequest.mockReturnValueOnce(of(undefined));

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.openSupportDialog();

        expect(dialog.open).toHaveBeenCalled();
        expect(supportApiService.createSupportRequest).toHaveBeenCalledWith('Bug in login', 'Something is broken');
        expect(toastrService.success).toHaveBeenCalled();
    });

    it('open support dialog and cancel does not send anything', () => {
        dialog.open.mockReturnValueOnce({afterClosed: () => of(undefined)} as any);

        const fixture = TestBed.createComponent(DefaultHeaderComponent);
        const component = fixture.componentInstance;

        component.openSupportDialog();

        expect(dialog.open).toHaveBeenCalled();
        expect(supportApiService.createSupportRequest).not.toHaveBeenCalled();
    });

});
