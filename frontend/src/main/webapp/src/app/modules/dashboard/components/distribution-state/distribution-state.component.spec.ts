import {TestBed, waitForAsync} from '@angular/core/testing';
import {
  DistributionApiService,
  DistributionItem,
  DistributionStateItem
} from '../../../../api/distribution-api.service';
import {DistributionStateComponent} from './distribution-state.component';
import {BehaviorSubject, of} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {ModalModule} from '@coreui/angular';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('DistributionStateComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

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
        BrowserAnimationsModule,
        RouterTestingModule,
        ModalModule
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
          useValue: jasmine.createSpyObj('DistributionApiService', ['createNewDistribution', 'switchToNextState'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
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
    const subject = new BehaviorSubject<DistributionItem>(distribution);
    globalStateService.getCurrentDistribution.and.returnValue(subject);

    component.ngOnInit();

    expect(component.distribution).toEqual(distribution);
    expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
  });

  it('component init distribution not active', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    const subject = new BehaviorSubject<DistributionItem>(null);
    globalStateService.getCurrentDistribution.and.returnValue(subject);

    component.ngOnInit();

    expect(component.distribution).toBeNull();
    expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
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
    component.showNextDistributionStateModal = true;
    distributionApiService.switchToNextState.and.returnValue(of(null));

    component.switchToNextState();

    expect(distributionApiService.switchToNextState).toHaveBeenCalled();
    expect(component.showNextDistributionStateModal).toBeFalsy();
  });

});
