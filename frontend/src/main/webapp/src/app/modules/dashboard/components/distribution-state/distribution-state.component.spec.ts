import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DistributionApiService, DistributionCloseValidationResult, DistributionItem } from '../../../../api/distribution-api.service';
import { DistributionStateComponent } from './distribution-state.component';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { CardModule, ColComponent, ModalModule, ProgressModule, RowComponent } from '@coreui/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DistributionStateComponent', () => {
    let distributionApiService: MockedObject<DistributionApiService>;
    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach((() => {
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
                    useValue: {
                        createNewDistribution: vi.fn().mockName("DistributionApiService.createNewDistribution"),
                        closeDistribution: vi.fn().mockName("DistributionApiService.closeDistribution")
                    }
                },
                {
                    provide: GlobalStateService,
                    useValue: {
                        getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution")
                    }
                }
            ]
        }).compileComponents();

        distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        const subject = new BehaviorSubject<DistributionItem>(null);
        globalStateService.getCurrentDistribution.mockReturnValue(subject);

        expect(component).toBeTruthy();
    });

    it('component init distribution active', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        const subject = new BehaviorSubject<DistributionItem>(distribution);
        globalStateService.getCurrentDistribution.mockReturnValue(subject);

        component.ngOnInit();

        expect(component.distribution).toEqual(distribution);
        expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
    });

    it('component init distribution not active', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        const subject = new BehaviorSubject<DistributionItem>(null);
        globalStateService.getCurrentDistribution.mockReturnValue(subject);

        component.ngOnInit();

        expect(component.distribution).toBeNull();
        expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
    });

    it('create new distribution', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        const subject = new BehaviorSubject<DistributionItem>(null);
        globalStateService.getCurrentDistribution.mockReturnValue(subject);
        distributionApiService.createNewDistribution.mockReturnValue(EMPTY);

        component.createNewDistribution();

        expect(distributionApiService.createNewDistribution).toHaveBeenCalled();
    });

    it('close distribution without errors and warnings', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal = true;

        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(new BehaviorSubject<DistributionItem>(distribution));

        const validationResult: DistributionCloseValidationResult = {
            errors: [],
            warnings: []
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal).toBe(false);
    });

    it('close distribution without any response at all', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal = true;

        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(new BehaviorSubject<DistributionItem>(distribution));

        distributionApiService.closeDistribution.mockReturnValue(of(null));

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal).toBe(false);
    });

    it('close distribution with errors', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal = true;
        component.showCloseDistributionValidationModal = false;

        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(new BehaviorSubject<DistributionItem>(distribution));

        const validationResult: DistributionCloseValidationResult = {
            errors: ['Error 1', 'Error 2'],
            warnings: []
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal).toBe(false);
        expect(component.showCloseDistributionValidationModal).toBe(true);
    });

    it('close distribution with warnings', () => {
        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal = true;
        component.showCloseDistributionValidationModal = false;

        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(new BehaviorSubject<DistributionItem>(distribution));

        const validationResult: DistributionCloseValidationResult = {
            errors: [],
            warnings: ['Warning 1', 'Warning 2']
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        component.closeDistribution(false);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(false);
        expect(component.showCloseDistributionModal).toBe(false);
        expect(component.showCloseDistributionValidationModal).toBe(true);
    });

});
