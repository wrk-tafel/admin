import {TafelIfDistributionActiveDirective} from './tafel-if-distribution-active.directive';
import {BehaviorSubject} from 'rxjs';
import {DistributionItem} from '../../api/distribution-api.service';

describe('TafelIfDistributionActiveDirective', () => {

  function setup() {
    const viewContainerSpy =
      jasmine.createSpyObj('ViewContainer', ['createEmbeddedView', 'clear']);
    const globalStateServiceSpy =
      jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution']);
    const directive = new TafelIfDistributionActiveDirective(undefined, viewContainerSpy, globalStateServiceSpy);
    return {viewContainerSpy, globalStateServiceSpy, directive};
  }

  it('should render when distribution is active', () => {
    const {viewContainerSpy, globalStateServiceSpy, directive} = setup();
    const mockDistributionItem: DistributionItem = {id: 123, startedAt: new Date()};
    globalStateServiceSpy.getCurrentDistribution.and.returnValue(new BehaviorSubject(mockDistributionItem));

    directive.ngAfterViewInit();

    expect(viewContainerSpy.clear).toHaveBeenCalled();
    expect(viewContainerSpy.createEmbeddedView).toHaveBeenCalled();
  });

  it('should not render distribution is inactive', () => {
    const {viewContainerSpy, globalStateServiceSpy, directive} = setup();
    globalStateServiceSpy.getCurrentDistribution.and.returnValue(new BehaviorSubject(undefined));

    directive.ngAfterViewInit();

    expect(viewContainerSpy.clear).toHaveBeenCalled();
  });

});
