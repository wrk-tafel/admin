import {AuthGuardService} from './authguard.service';
import {ActivatedRouteSnapshot} from '@angular/router';

describe('AuthGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService',
        ['isAuthenticated', 'hasAnyPermission', 'hasPermission', 'redirectToLogin']
      );
    const service = new AuthGuardService(authServiceSpy);
    return {service, authServiceSpy};
  }

  it('canActivate when authenticated', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeTrue();
  });

  it('canActivate when authenticated without permissions', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
  });

  it('canActivate when authenticated with wrong permission', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);
    authServiceSpy.hasPermission.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{data: {permission: 'PERM2'}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith('fehlgeschlagen');
  });

  it('canActivate when authenticated with correct permission', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyPermission.and.returnValue(true);
    authServiceSpy.hasPermission.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{data: {permission: 'PERM1'}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeTruthy();
    expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
  });

});
