import { AuthGuardData, AuthGuardService } from './authguard.service';
import { ActivatedRouteSnapshot, CanActivateChildFn, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { AuthenticationService } from './authentication.service';

@Component({template: '', standalone: true})
class DummyRouteComponent {
}

describe('AuthGuardService', () => {
    function setup() {
        const authServiceSpy = {
            isAuthenticated: vi.fn().mockName('AuthenticationService.isAuthenticated'),
            loadUserInfo: vi.fn().mockName('AuthenticationService.loadUserInfo'),
            hasAnyPermission: vi.fn().mockName('AuthenticationService.hasAnyPermission'),
            hasAnyPermissionOf: vi.fn().mockName('AuthenticationService.hasAnyPermissionOf'),
            redirectToLogin: vi.fn().mockName('AuthenticationService.redirectToLogin'),
            isMfaPending: vi.fn().mockName('AuthenticationService.isMfaPending').mockReturnValue(false),
            isMfaSetupRequired: vi.fn().mockName('AuthenticationService.isMfaSetupRequired').mockReturnValue(false),
            redirectToMfaSetup: vi.fn().mockName('AuthenticationService.redirectToMfaSetup'),
            redirectToMfa: vi.fn().mockName('AuthenticationService.redirectToMfa')
        };
        TestBed.configureTestingModule({
            providers: [
                AuthGuardService,
                { provide: AuthenticationService, useValue: authServiceSpy }
            ]
        });
        const service = TestBed.inject(AuthGuardService);
        return { service, authServiceSpy };
    }

    // The password was right but the code is still owed: the session has no permissions yet, which must
    // not read as "access denied" - the user is sent to the code page instead.
    it('canActivate when the second factor is still owed redirects to the code page, whatever the route needs', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'u', permissions: [], mfaPending: true });
        authServiceSpy.isMfaPending.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermission: true } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToMfa).toHaveBeenCalled();
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

    // The deployment requires a second factor and this user has none: only the page that sets one up works.
    it('canActivate when a second factor has to be set up leads every route there, except that page itself', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'u', permissions: [], mfaSetupRequired: true });
        authServiceSpy.isMfaSetupRequired.mockReturnValue(true);

        const otherRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermission: true }, routeConfig: { path: 'uebersicht' } };
        expect(await service.canActivate(otherRoute)).toBe(false);
        expect(authServiceSpy.redirectToMfaSetup).toHaveBeenCalledTimes(1);
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();

        // the tab that sets it up, and the account page that tab is rendered in
        for (const path of ['zwei-faktor', 'konto']) {
            const setupRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: {}, routeConfig: { path } };
            expect(await service.canActivate(setupRoute)).toBe(true);
        }
        expect(authServiceSpy.redirectToMfaSetup).toHaveBeenCalledTimes(1);

        // the other tabs of the account page lead to the two-factor one
        const passwordTab = <ActivatedRouteSnapshot><AuthGuardData>{ data: {}, routeConfig: { path: 'passwort' } };
        expect(await service.canActivate(passwordTab)).toBe(false);
        expect(authServiceSpy.redirectToMfaSetup).toHaveBeenCalledTimes(2);
    });

    it('canActivate when not authenticated redirects to plain login without an error message', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith();
    });

    it('canActivate when authenticated', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'user', permissions: ['PERM1'] });
        authServiceSpy.hasAnyPermission.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(true);
    });

    it('canActivate when authenticated without permissions', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'user', permissions: [] });

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(true);
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

    it('canActivate when authenticated without permissions but anyPermission is necessary', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'user', permissions: [] });
        authServiceSpy.hasAnyPermission.mockReturnValue(false);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermission: true } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
    });

    it('canActivate when authenticated with wrong permission', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'user', permissions: ['PERM2'] });
        authServiceSpy.hasAnyPermission.mockReturnValue(true);
        authServiceSpy.hasAnyPermissionOf.mockReturnValue(false);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermissionOf: ['PERM2'] } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
    });

    it('canActivate when authenticated with correct permission', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue({ username: 'user', permissions: ['PERM1'] });
        authServiceSpy.hasAnyPermission.mockReturnValue(true);
        authServiceSpy.hasAnyPermissionOf.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermissionOf: ['PERM1'] } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBeTruthy();
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

    it('canActivate when the cached session looks valid but the server says it has expired revalidates and blocks navigation', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.loadUserInfo.mockResolvedValue(null);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        // errorHandlerInterceptor already redirects with 'abgelaufen' as a side effect of the
        // loadUserInfo() request's 401 - the guard must not also redirect (would double-navigate).
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

});

// Angular 22 flipped the router's default paramsInheritanceStrategy from 'emptyOnly' to 'always'.
// These tests prove that a nested child route with no data of its own (e.g. kunden/detail/:id)
// now correctly inherits anyPermissionOf from its parent (e.g. kunden), and that AuthGuardService
// enforces it during a real navigation - not just against a hand-built ActivatedRouteSnapshot.
describe('AuthGuardService with real router navigation (route data inheritance)', () => {
    function setupRouter(authServiceSpy: any) {
        const authGuardChild: CanActivateChildFn = (route) => TestBed.inject(AuthGuardService).canActivate(route);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthenticationService, useValue: authServiceSpy },
                provideRouter([
                    {
                        path: 'kunden',
                        canActivateChild: [authGuardChild],
                        data: { anyPermissionOf: ['CUSTOMER'] },
                        children: [
                            { path: 'detail/:id', component: DummyRouteComponent }
                        ]
                    }
                ])
            ]
        });
    }

    function mockAuthService(hasAnyPermissionOf: boolean) {
        return {
            isAuthenticated: vi.fn().mockReturnValue(true),
            loadUserInfo: vi.fn().mockResolvedValue({ username: 'user', permissions: ['CUSTOMER'] }),
            hasAnyPermission: vi.fn().mockReturnValue(true),
            hasAnyPermissionOf: vi.fn().mockReturnValue(hasAnyPermissionOf),
            isMfaPending: vi.fn().mockReturnValue(false),
            isMfaSetupRequired: vi.fn().mockReturnValue(false),
            redirectToLogin: vi.fn()
        };
    }

    it('inherits the parent route\'s anyPermissionOf into the nested child route and allows access when granted', async () => {
        const authServiceSpy = mockAuthService(true);
        setupRouter(authServiceSpy);

        await RouterTestingHarness.create('/kunden/detail/5');

        expect(authServiceSpy.hasAnyPermissionOf).toHaveBeenCalledWith(['CUSTOMER']);
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

    it('blocks navigation to the nested child route when the inherited permission check fails', async () => {
        const authServiceSpy = mockAuthService(false);
        setupRouter(authServiceSpy);

        await RouterTestingHarness.create('/kunden/detail/5');

        expect(authServiceSpy.hasAnyPermissionOf).toHaveBeenCalledWith(['CUSTOMER']);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
    });

    // A nested route that names its own anyPermissionOf replaces the inherited one for its own check, while the
    // guard still runs for its parent too: both requirements apply (einstellungen/anstehende-loeschungen).
    describe('a nested route with data of its own', () => {
        function setupNestedRouter(authServiceSpy: any) {
            const authGuardChild: CanActivateChildFn = (route) => TestBed.inject(AuthGuardService).canActivate(route);

            TestBed.configureTestingModule({
                providers: [
                    { provide: AuthenticationService, useValue: authServiceSpy },
                    provideRouter([
                        {
                            path: '',
                            canActivateChild: [authGuardChild],
                            children: [
                                {
                                    path: 'einstellungen',
                                    data: { anyPermissionOf: ['SETTINGS'] },
                                    children: [
                                        { path: 'mitarbeiter', component: DummyRouteComponent },
                                        {
                                            path: 'anstehende-loeschungen',
                                            component: DummyRouteComponent,
                                            data: { anyPermissionOf: ['ADMINISTRATOR'] }
                                        }
                                    ]
                                }
                            ]
                        }
                    ])
                ]
            });
        }

        function authServiceHolding(...held: string[]) {
            const spy = mockAuthService(true);
            spy.hasAnyPermissionOf.mockImplementation((permissions: string[]) => permissions.some(permission => held.includes(permission)));
            return spy;
        }

        it('turns away a user holding only the parent route permission', async () => {
            const authServiceSpy = authServiceHolding('SETTINGS');
            setupNestedRouter(authServiceSpy);

            await RouterTestingHarness.create('/einstellungen/anstehende-loeschungen');

            expect(authServiceSpy.hasAnyPermissionOf).toHaveBeenCalledWith(['ADMINISTRATOR']);
            expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
        });

        it('lets in a user holding the nested route permission', async () => {
            const authServiceSpy = authServiceHolding('SETTINGS', 'ADMINISTRATOR');
            setupNestedRouter(authServiceSpy);

            await RouterTestingHarness.create('/einstellungen/anstehende-loeschungen');

            expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
        });

        it('still lets a user holding only the parent route permission open its other children', async () => {
            const authServiceSpy = authServiceHolding('SETTINGS');
            setupNestedRouter(authServiceSpy);

            await RouterTestingHarness.create('/einstellungen/mitarbeiter');

            expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
        });
    });
});
