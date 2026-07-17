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

describe('DefaultHeaderComponent', () => {
    let authenticationService: MockedObject<AuthenticationService>;
    let globalStateService: MockedObject<GlobalStateService>;

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
                }
            ]
        })
            .compileComponents();

        authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
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

        expect(authenticationService.redirectToLogin).toHaveBeenCalled();
    });

});
