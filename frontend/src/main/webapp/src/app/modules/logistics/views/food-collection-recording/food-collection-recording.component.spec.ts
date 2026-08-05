import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoodCollectionRecordingComponent } from './food-collection-recording.component';
import { Router } from '@angular/router';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { DistributionItem } from '../../../../api/distribution-api.service';
import { signal } from '@angular/core';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('FoodCollectionRecordingComponent', () => {
    let router: MockedObject<Router>;
    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule
            ],
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName('Router.navigate')
                    }
                },
                {
                    provide: GlobalStateService,
                    useValue: {
                        getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution'),
                        getHasReceivedDistribution: vi.fn().mockName('GlobalStateService.getHasReceivedDistribution')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router) as MockedObject<Router>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('ngOnInit without active distribution', () => {
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(null).asReadonly());
        globalStateService.getHasReceivedDistribution.mockReturnValue(signal(true).asReadonly());

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const componentRef = fixture.componentRef;

        // Provide required model inputs before detectChanges
        componentRef.setInput('routeList', { routes: [] });
        componentRef.setInput('carList', { cars: [] });
        componentRef.setInput('foodCategories', []);

        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    });

    it('ngOnInit without active distribution but before the first SSE message arrives does not redirect', () => {
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(null).asReadonly());
        globalStateService.getHasReceivedDistribution.mockReturnValue(signal(false).asReadonly());

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const componentRef = fixture.componentRef;

        // Provide required model inputs before detectChanges
        componentRef.setInput('routeList', { routes: [] });
        componentRef.setInput('carList', { cars: [] });
        componentRef.setInput('foodCategories', []);

        fixture.detectChanges();

        expect(router.navigate).not.toHaveBeenCalled();
    });

});
