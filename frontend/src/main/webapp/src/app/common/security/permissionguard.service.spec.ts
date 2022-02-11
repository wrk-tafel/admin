import { ActivatedRouteSnapshot } from '@angular/router';
import { PermissionGuardService } from './permissionguard.service';

describe('PermissionGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService', ['hasRole']);
    const routerSpy =
      jasmine.createSpyObj('Router', ['navigate']);
    const service = new PermissionGuardService(authServiceSpy, routerSpy);
    return { service, authServiceSpy, routerSpy };
  }

  it('canActivate - not authenticated and no permission needed', () => {
    const { service, authServiceSpy, routerSpy } = setup();
    authServiceSpy.hasRole.and.returnValue(false);

    const activatedRoute = <ActivatedRouteSnapshot>{ data: {} };
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('canActivate - not authenticated and permission needed', () => {
    const { service, authServiceSpy, routerSpy } = setup();
    authServiceSpy.hasRole.and.returnValue(false);

    const activatedRoute = <any>{ data: { expectedPermission: 'PERM1' } };
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('canActivate - authenticated and permission needed', () => {
    const { service, authServiceSpy, routerSpy } = setup();
    authServiceSpy.hasRole.and.returnValue(true);

    const activatedRoute = <any>{ data: { expectedPermission: 'PERM1' } };
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeTrue();
    expect(authServiceSpy.hasRole).toHaveBeenCalledWith('PERM1');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('canActivate - authenticated and no permission needed', () => {
    const { service, authServiceSpy, routerSpy } = setup();
    authServiceSpy.hasRole.and.returnValue(true);

    const activatedRoute = <any>{ data: {} };
    const canActivate = service.canActivateChild(activatedRoute);

    expect(canActivate).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalled();
  });

});
