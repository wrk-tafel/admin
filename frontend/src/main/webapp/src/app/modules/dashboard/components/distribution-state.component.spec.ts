import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService, DistributionItem, DistributionStateItem} from '../../../api/distribution-api.service';
import {DistributionStateComponent} from './distribution-state.component';
import {ModalModule} from 'ngx-bootstrap/modal';
import {of} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';

describe('DistributionStateComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  const mockDistributionStates: DistributionStateItem[] = [
    {
      name: 'OFFEN',
      stateLabel: 'Opened',
      actionLabel: 'Paused'
    },
    {
      name: 'PAUSE',
      stateLabel: 'Paused',
      actionLabel: 'Finish'
    },
    {
      name: 'CLOSED',
      stateLabel: 'Closed'
    }
  ];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ModalModule.forRoot()
      ],
      declarations: [
        DistributionStateComponent
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                distributionStates: {
                  states: mockDistributionStates
                }
              }
            }
          }
        },
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['getCurrentDistribution', 'createNewDistribution', 'switchToNextState'])
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

    const distribution: DistributionItem = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };
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

  it('create new distribution', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    distributionApiService.createNewDistribution.and.returnValue(of(null));

    component.createNewDistribution();

    expect(distributionApiService.createNewDistribution).toHaveBeenCalled();
  });

  it('switch to next state', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    component.nextDistributionStateModal = jasmine.createSpyObj('Modal', ['hide']);
    distributionApiService.switchToNextState.and.returnValue(of(null));

    component.switchToNextState();

    expect(distributionApiService.switchToNextState).toHaveBeenCalled();
    expect(component.nextDistributionStateModal.hide).toHaveBeenCalled();
  });

});
