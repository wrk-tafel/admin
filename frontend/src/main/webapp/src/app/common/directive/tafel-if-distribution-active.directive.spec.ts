import { TafelIfDistributionActiveDirective } from './tafel-if-distribution-active.directive';
import { BehaviorSubject } from 'rxjs';
import { DistributionItem } from '../../api/distribution-api.service';

describe('TafelIfDistributionActiveDirective', () => {

    function setup() {
        const viewContainerSpy = {
            createEmbeddedView: vi.fn().mockName("ViewContainer.createEmbeddedView"),
            clear: vi.fn().mockName("ViewContainer.clear")
        };
        const globalStateServiceSpy = {
            getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution")
        };
        const directive = new TafelIfDistributionActiveDirective(undefined, viewContainerSpy as any, globalStateServiceSpy as any);
        return { viewContainerSpy, globalStateServiceSpy, directive };
    }

    it('should render when distribution is active', () => {
        const { viewContainerSpy, globalStateServiceSpy, directive } = setup();
        const mockDistributionItem: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateServiceSpy.getCurrentDistribution.mockReturnValue(new BehaviorSubject(mockDistributionItem));

        directive.ngAfterViewInit();

        expect(viewContainerSpy.clear).toHaveBeenCalled();
        expect(viewContainerSpy.createEmbeddedView).toHaveBeenCalled();
    });

    it('should not render distribution is inactive', () => {
        const { viewContainerSpy, globalStateServiceSpy, directive } = setup();
        globalStateServiceSpy.getCurrentDistribution.mockReturnValue(new BehaviorSubject(undefined));

        directive.ngAfterViewInit();

        expect(viewContainerSpy.clear).toHaveBeenCalled();
    });

});
