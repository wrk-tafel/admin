import { AuthGuardService } from './authguard.service';

describe('AuthGuardService', () => {
  function setup() {
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService', ['isAuthenticated', 'logoutAndRedirectExpired']);
    const service = new AuthGuardService(authServiceSpy);
    return { service, authServiceSpy };
  }

  it('canActivate when authenticated', () => {
    const { service, authServiceSpy } = setup();
    authServiceSpy.isAuthenticated.and.returnValue(true)

    let canActivate = service.canActivateChild(null, null)
    expect(canActivate).toBeTrue()
  });


  it('canActivate when not authenticated', () => {
    const { service, authServiceSpy } = setup();
    authServiceSpy.isAuthenticated.and.returnValue(false)

    let canActivate = service.canActivateChild(null, null)
    expect(canActivate).toBeFalse()
    expect(authServiceSpy.logoutAndRedirectExpired).toHaveBeenCalled()
  });

});
