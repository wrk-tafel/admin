import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DistributionApiService, DistributionCloseValidationResult, DistributionItem } from '../../../../api/distribution-api.service';
import { DistributionStateComponent } from './distribution-state.component';
import { EMPTY, of } from 'rxjs';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { CardModule, ColComponent, ModalModule, ProgressModule, RowComponent } from '@coreui/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

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
        globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('component init distribution active', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        expect(component.distribution()).toEqual(distribution);
        expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
    });

    it('component init distribution not active', () => {
        globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        expect(component.distribution()).toBeNull();
        expect(globalStateService.getCurrentDistribution).toHaveBeenCalled();
    });

    it('create new distribution', () => {
        globalStateService.getCurrentDistribution.mockReturnValue(signal(null).asReadonly());
        distributionApiService.createNewDistribution.mockReturnValue(EMPTY);

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        component.createNewDistribution();

        expect(distributionApiService.createNewDistribution).toHaveBeenCalled();
    });

    it('close distribution without errors and warnings', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const validationResult: DistributionCloseValidationResult = {
            errors: [],
            warnings: []
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal.set(true);

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal()).toBe(false);
    });

    it('close distribution without any response at all', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());
        distributionApiService.closeDistribution.mockReturnValue(of(null));

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal.set(true);

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal()).toBe(false);
    });

    it('close distribution with errors', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const validationResult: DistributionCloseValidationResult = {
            errors: ['Error 1', 'Error 2'],
            warnings: []
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal.set(true);
        component.showCloseDistributionValidationModal.set(false);

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(component.showCloseDistributionModal()).toBe(false);
        expect(component.showCloseDistributionValidationModal()).toBe(true);
    });

    it('close distribution with warnings', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const validationResult: DistributionCloseValidationResult = {
            errors: [],
            warnings: ['Warning 1', 'Warning 2']
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;
        component.showCloseDistributionModal.set(true);
        component.showCloseDistributionValidationModal.set(false);

        component.closeDistribution(false);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(false);
        expect(component.showCloseDistributionModal()).toBe(false);
        expect(component.showCloseDistributionValidationModal()).toBe(true);
    });

});
