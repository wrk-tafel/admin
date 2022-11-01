import {ActivatedRouteSnapshot} from '@angular/router';
import {PermissionGuardService} from './permissionguard.service';

describe('PermissionGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService', ['hasPermission', 'getPermissions']);
    const routerSpy =
      jasmine.createSpyObj('Router', ['navigate']);
    const service = new PermissionGuardService(authServiceSpy, routerSpy);
    return {service, authServiceSpy, routerSpy};
  }

  it('canActivate - no permissions at all leads to login with forbidden message', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.getPermissions.and.returnValue([]);
    authServiceSpy.hasPermission.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot>{data: {}};
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['login', 'forbidden']);
  });

  it('canActivate - permission needed but not given', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.getPermissions.and.returnValue(['PERM2']);
    authServiceSpy.hasPermission.and.returnValue(false);

    const activatedRoute = <any>{data: {expectedPermission: 'PERM1'}};
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('canActivate - permission needed and given', () => {
    const {service, authServiceSpy, routerSpy} = setup();
    authServiceSpy.getPermissions.and.returnValue(['PERM1']);
    authServiceSpy.hasPermission.and.returnValue(true);

    const activatedRoute = <any>{data: {expectedPermission: 'PERM1'}};
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeTrue();
    expect(authServiceSpy.hasPermission).toHaveBeenCalledWith('PERM1');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

});
