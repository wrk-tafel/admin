import {AuthGuardData, AuthGuardService} from './authguard.service';
import {ActivatedRouteSnapshot} from '@angular/router';

describe('AuthGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService',
        ['isAuthenticated', 'hasAnyPermission', 'hasAnyPermissionOf', 'redirectToLogin']
      );
    const service = new AuthGuardService(authServiceSpy);
    return {service, authServiceSpy};
  }

  it('canActivate when authenticated', async () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = await service.canActivate(activatedRoute);

    expect(canActivate).toBeTrue();
  });

  it('canActivate when authenticated without permissions', async () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{data: {}};
    const canActivate = await service.canActivate(activatedRoute);

    expect(canActivate).toBeTrue();
    expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
  });

  it('canActivate when authenticated without permissions but anyPermission is necessary', async () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{data: {anyPermission: true}};
    const canActivate = await service.canActivate(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
  });

  it('canActivate when authenticated with wrong permission', async () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);
    authServiceSpy.hasAnyPermissionOf.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{data: {anyPermissionOf: ['PERM2']}};
    const canActivate = await service.canActivate(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
  });

  it('canActivate when authenticated with correct permission', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);
    authServiceSpy.hasAnyPermissionOf.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot><AuthGuardData>{data: {anyPermissionOf: ['PERM1']}};
    const canActivate = service.canActivate(activatedRoute);

    expect(canActivate).toBeTruthy();
    expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
  });

});
