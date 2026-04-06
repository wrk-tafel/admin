import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DistributionApiService, DistributionCloseValidationResult, DistributionItem } from '../../../../api/distribution-api.service';
import { DistributionStateComponent } from './distribution-state.component';
import { EMPTY, of } from 'rxjs';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

describe('DistributionStateComponent', () => {
    let distributionApiService: MockedObject<DistributionApiService>;
    let globalStateService: MockedObject<GlobalStateService>;
    let matDialog: MockedObject<MatDialog>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                MatCardModule,
                MatButtonModule
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
                },
                {
                    provide: MatDialog,
                    useValue: {
                        open: vi.fn().mockName("MatDialog.open")
                    }
                }
            ]
        }).compileComponents();

        distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
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

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        // No validation dialog should be opened when there are no errors/warnings
        expect(matDialog.open).not.toHaveBeenCalled();
    });

    it('close distribution without any response at all', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());
        distributionApiService.closeDistribution.mockReturnValue(of(null));

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(matDialog.open).not.toHaveBeenCalled();
    });

    it('close distribution with errors opens validation dialog', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const validationResult: DistributionCloseValidationResult = {
            errors: ['Error 1', 'Error 2'],
            warnings: []
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));
        matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) } as any);

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        component.closeDistribution(true);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(true);
        expect(matDialog.open).toHaveBeenCalled();
    });

    it('close distribution with warnings opens validation dialog', () => {
        const distribution: DistributionItem = { id: 123, startedAt: new Date() };
        globalStateService.getCurrentDistribution.mockReturnValue(signal(distribution).asReadonly());

        const validationResult: DistributionCloseValidationResult = {
            errors: [],
            warnings: ['Warning 1', 'Warning 2']
        };
        distributionApiService.closeDistribution.mockReturnValue(of(validationResult));
        matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) } as any);

        const fixture = TestBed.createComponent(DistributionStateComponent);
        const component = fixture.componentInstance;

        component.closeDistribution(false);

        expect(distributionApiService.closeDistribution).toHaveBeenCalledWith(false);
        expect(matDialog.open).toHaveBeenCalled();
    });

});
