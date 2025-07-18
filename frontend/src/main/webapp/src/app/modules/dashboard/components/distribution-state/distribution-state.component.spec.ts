import {TestBed, waitForAsync} from '@angular/core/testing';
import {
  DistributionApiService,
  DistributionCloseValidationResult,
  DistributionItem
} from '../../../../api/distribution-api.service';
import {DistributionStateComponent} from './distribution-state.component';
import {BehaviorSubject, EMPTY, of} from 'rxjs';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('DistributionStateComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ModalModule,
        CardModule,
        RowComponent,
        ColComponent,
        ProgressModule
      ],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['createNewDistribution', 'closeDistribution'])
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

    const subject = new BehaviorSubject<DistributionItem>(null);
    globalStateService.getCurrentDistribution.and.returnValue(subject);

    expect(component).toBeTruthy();
  });

  it('component init distribution active', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;

    const distribution: DistributionItem = {id: 123};
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

    const subject = new BehaviorSubject<DistributionItem>(null);
    globalStateService.getCurrentDistribution.and.returnValue(subject);
    distributionApiService.createNewDistribution.and.returnValue(EMPTY);

    component.createNewDistribution();

    expect(distributionApiService.createNewDistribution).toHaveBeenCalled();
  });

  it('close distribution without errors and warnings', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    component.showCloseDistributionModal = true;

    const distribution: DistributionItem = {id: 123};
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(distribution));

    const validationResult: DistributionCloseValidationResult = {
      errors: [],
      warnings: []
    };
    distributionApiService.closeDistribution.and.returnValue(of(validationResult));

    component.closeDistribution(true);

    expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
    expect(component.showCloseDistributionModal).toBeFalse();
  });

  it('close distribution with errors', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    component.showCloseDistributionModal = true;
    component.showCloseDistributionValidationModal = false;

    const distribution: DistributionItem = {id: 123};
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(distribution));

    const validationResult: DistributionCloseValidationResult = {
      errors: ['Error 1', 'Error 2'],
      warnings: []
    };
    distributionApiService.closeDistribution.and.returnValue(of(validationResult));

    component.closeDistribution(true);

    expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
    expect(component.showCloseDistributionModal).toBeFalse();
    expect(component.showCloseDistributionValidationModal).toBeTrue();
  });

  it('close distribution with warnings', () => {
    const fixture = TestBed.createComponent(DistributionStateComponent);
    const component = fixture.componentInstance;
    component.showCloseDistributionModal = true;
    component.showCloseDistributionValidationModal = false;

    const distribution: DistributionItem = {id: 123};
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(distribution));

    const validationResult: DistributionCloseValidationResult = {
      errors: [],
      warnings: ['Warning 1', 'Warning 2']
    };
    distributionApiService.closeDistribution.and.returnValue(of(validationResult));

    component.closeDistribution(false);

    expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(false);
    expect(component.showCloseDistributionModal).toBeFalse();
    expect(component.showCloseDistributionValidationModal).toBeTrue();
  });

});
