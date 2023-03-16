import {GlobalStateService} from './global-state.service';
import {DistributionApiService} from '../../api/distribution-api.service';
import {of} from 'rxjs';

describe('GlobalStateService', () => {
  function setup() {
    const distributionApiServiceSpy: jasmine.SpyObj<DistributionApiService> = jasmine.createSpyObj('DistributionApiService', ['getCurrentDistribution']);

    const service = new GlobalStateService(distributionApiServiceSpy);

    return {service, distributionApiServiceSpy};
  }

  it('init calls services correctly', () => {
    const {service, distributionApiServiceSpy} = setup();

    const testDistribution = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };
    distributionApiServiceSpy.getCurrentDistribution.and.returnValue(of(testDistribution));

    let checked = false;
    service.getCurrentDistribution().subscribe(distributionItem => {
      expect(distributionItem).toEqual(testDistribution);
      checked = true;
    });

    service.init();

    expect(distributionApiServiceSpy.getCurrentDistribution).toHaveBeenCalled();
    expect(checked).toBeTruthy();
  });

});
