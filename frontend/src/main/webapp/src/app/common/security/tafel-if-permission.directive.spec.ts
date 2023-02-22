import {TafelIfPermissionDirective} from './tafel-if-permission.directive';
import {AuthenticationService} from './authentication.service';

describe('TafelIfPermissionDirective', () => {
  function setup() {
    const viewContainerSpy =
      jasmine.createSpyObj('ViewContainer', ['createEmbeddedView', 'clear']);
    const authServiceSpy =
      jasmine.createSpyObj('AuthenticationService', ['hasPermission']);
    const directive = new TafelIfPermissionDirective(undefined, viewContainerSpy, authServiceSpy);
    return {viewContainerSpy, authServiceSpy, directive};
  }

  it('should render when permission is given', () => {
    const {viewContainerSpy, authServiceSpy, directive} = setup();
    authServiceSpy.hasPermission.withArgs('PERM1').and.returnValue(true);

    directive.tafelIfPermission = 'PERM1';

    expect(viewContainerSpy.createEmbeddedView).toHaveBeenCalled();
  });

  it('should not render when permission is missing', () => {
    const {viewContainerSpy, authServiceSpy, directive} = setup();
    authServiceSpy.hasPermission.withArgs('PERM1').and.returnValue(false);

    directive.tafelIfPermission = 'PERM1';

    expect(viewContainerSpy.clear).toHaveBeenCalled();
  });

});
