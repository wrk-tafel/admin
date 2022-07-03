import { AuthGuardService } from './authguard.service';
import expect from 'jasmine-core';

describe('AuthGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService', ['isAuthenticated', 'logoutAndRedirect']);
    const service = new AuthGuardService(authServiceSpy);
    return { service, authServiceSpy };
  }

  it('canActivate when authenticated', () => {
    const { service, authServiceSpy } = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const canActivate = service.canActivateChild(null, null);

    expect(canActivate).toBeTrue();
  });

  it('canActivate when not authenticated', () => {
    const { service, authServiceSpy } = setup();
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const canActivate = service.canActivateChild(null, null);

    expect(canActivate).toBeFalse();
    expect(authServiceSpy.logoutAndRedirect).toHaveBeenCalled();
  });

});
