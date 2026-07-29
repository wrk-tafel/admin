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
            hasAnyPermission: vi.fn().mockName('AuthenticationService.hasAnyPermission'),
            hasAnyPermissionOf: vi.fn().mockName('AuthenticationService.hasAnyPermissionOf'),
            redirectToLogin: vi.fn().mockName('AuthenticationService.redirectToLogin')
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
        authServiceSpy.hasAnyPermission.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(true);
    });

    it('canActivate when authenticated without permissions', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: {} };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(true);
        expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
    });

    it('canActivate when authenticated without permissions but anyPermission is necessary', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.hasAnyPermission.mockReturnValue(false);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermission: true } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
    });

    it('canActivate when authenticated with wrong permission', async () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.hasAnyPermission.mockReturnValue(true);
        authServiceSpy.hasAnyPermissionOf.mockReturnValue(false);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermissionOf: ['PERM2'] } };
        const canActivate = await service.canActivate(activatedRoute);

        expect(canActivate).toBe(false);
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
    });

    it('canActivate when authenticated with correct permission', () => {
        const { service, authServiceSpy } = setup();
        authServiceSpy.isAuthenticated.mockReturnValue(true);
        authServiceSpy.hasAnyPermission.mockReturnValue(true);
        authServiceSpy.hasAnyPermissionOf.mockReturnValue(true);

        const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{ data: { anyPermissionOf: ['PERM1'] } };
        const canActivate = service.canActivate(activatedRoute);

        expect(canActivate).toBeTruthy();
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
            hasAnyPermission: vi.fn().mockReturnValue(true),
            hasAnyPermissionOf: vi.fn().mockReturnValue(hasAnyPermissionOf),
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
});
