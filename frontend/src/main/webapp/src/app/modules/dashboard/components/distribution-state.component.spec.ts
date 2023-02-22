import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService, DistributionItem} from '../../../api/distribution-api.service';
import {DistributionStateComponent} from './distribution-state.component';
import {ModalDirective, ModalModule} from 'ngx-bootstrap/modal';
import {of} from 'rxjs';

describe('DistributionStateComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule.forRoot()
      ],
      declarations: [
        DistributionStateComponent
      ],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['getCurrentDistribution', 'startDistribution', 'stopDistribution'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('component init distribution active', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    const distribution: DistributionItem = {id: 123};
    distributionApiService.getCurrentDistribution.and.returnValue(of(distribution));

    component.ngOnInit();

    expect(component.distribution).toEqual(distribution);
    expect(distributionApiService.getCurrentDistribution).toHaveBeenCalled();
  });

  it('component init distribution not active', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    distributionApiService.getCurrentDistribution.and.returnValue(of());

    component.ngOnInit();

    expect(component.distribution).toBeUndefined();
    expect(distributionApiService.getCurrentDistribution).toHaveBeenCalled();
  });

  it('start distribution', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    const distribution: DistributionItem = {id: 123};
    distributionApiService.startDistribution.and.returnValue(of(distribution));

    component.startDistribution();

    expect(component.distribution).toEqual(distribution);
    expect(distributionApiService.startDistribution).toHaveBeenCalled();
  });

  it('stop distribution', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    component.stopDistributionModal = jasmine.createSpyObj<ModalDirective>(['hide']);

    const distribution: DistributionItem = {id: 123};
    component.distribution = distribution;
    distributionApiService.stopDistribution.withArgs(distribution.id).and.returnValue(of(undefined));

    component.stopDistribution();

    expect(distributionApiService.stopDistribution).toHaveBeenCalledWith(distribution.id);
    expect(component.distribution).toBeUndefined();
    expect(component.stopDistributionModal.hide).toHaveBeenCalled();
  });

});
