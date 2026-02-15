import { AuthGuardData, AuthGuardService } from './authguard.service';
import { ActivatedRouteSnapshot } from '@angular/router';

describe('AuthGuardService', () => {
    function setup() {
        const authServiceSpy = {
            isAuthenticated: vi.fn().mockName("AuthenticationService.isAuthenticated"),
            hasAnyPermission: vi.fn().mockName("AuthenticationService.hasAnyPermission"),
            hasAnyPermissionOf: vi.fn().mockName("AuthenticationService.hasAnyPermissionOf"),
            redirectToLogin: vi.fn().mockName("AuthenticationService.redirectToLogin")
        };
        const service = new AuthGuardService(authServiceSpy as any);
        return { service, authServiceSpy };
    }

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
