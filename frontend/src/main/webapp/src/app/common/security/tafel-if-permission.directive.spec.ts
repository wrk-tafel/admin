import { TafelIfPermissionDirective } from './tafel-if-permission.directive';

describe('TafelIfPermissionDirective', () => {
    function setup() {
        const viewContainerSpy = {
            createEmbeddedView: vi.fn().mockName("ViewContainer.createEmbeddedView"),
            clear: vi.fn().mockName("ViewContainer.clear")
        } as any;
        const authServiceSpy = {
            hasPermission: vi.fn().mockName("AuthenticationService.hasPermission")
        } as any;
        const directive = new TafelIfPermissionDirective(undefined, viewContainerSpy, authServiceSpy);
        return { viewContainerSpy, authServiceSpy, directive };
    }

    it('should render when permission is given', () => {
        const { viewContainerSpy, authServiceSpy, directive } = setup();
        authServiceSpy.hasPermission.mockReturnValue(true);

        directive.tafelIfPermission = 'PERM1';

        expect(viewContainerSpy.clear).toHaveBeenCalled();
        expect(viewContainerSpy.createEmbeddedView).toHaveBeenCalled();
    });

    it('should not render when permission is missing', () => {
        const { viewContainerSpy, authServiceSpy, directive } = setup();
        authServiceSpy.hasPermission.mockReturnValue(false);

        directive.tafelIfPermission = 'PERM1';

        expect(viewContainerSpy.clear).toHaveBeenCalled();
    });

});
