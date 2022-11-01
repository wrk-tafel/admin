import {AuthGuardService} from './authguard.service';
import {ActivatedRouteSnapshot} from "@angular/router";

describe('AuthGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService',
        ['isAuthenticated', 'getPermissions', 'hasPermission', 'logoutAndRedirect']
      );
    const routerSpy =
      jasmine.createSpyObj('Router', ['navigate']);
    const service = new AuthGuardService(authServiceSpy, routerSpy);
    return {service, authServiceSpy, routerSpy};
  }

  it('canActivate when authenticated', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getPermissions.and.returnValue(['PERM1']);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeTrue();
  });

  it('canActivate when not authenticated', () => {
    const {service, authServiceSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.getPermissions.and.returnValue(['PERM1']);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.logoutAndRedirect).toHaveBeenCalled();
  });

  it('canActivate when authenticated without permissions', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getPermissions.and.returnValue([]);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['login', 'verweigert']);
  });

  it('canActivate when authenticated with wrong permission', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getPermissions.and.returnValue(['PERM1']);
    authServiceSpy.hasPermission.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{data: {expectedPermission: 'PERM2'}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('canActivate when authenticated with correct permission', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getPermissions.and.returnValue(['PERM1']);
    authServiceSpy.hasPermission.and.returnValue(true);

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{data: {expectedPermission: 'PERM1'}};
    const canActivate = service.canActivateChild(activatedRoute, null);

    expect(canActivate).toBeTruthy();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

});
