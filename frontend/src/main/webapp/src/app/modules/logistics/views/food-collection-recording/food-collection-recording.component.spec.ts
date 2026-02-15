import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoodCollectionRecordingComponent } from './food-collection-recording.component';
import { Router } from '@angular/router';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { DistributionItem } from '../../../../api/distribution-api.service';
import { signal } from '@angular/core';

describe('FoodCollectionRecordingComponent', () => {
    let router: MockedObject<Router>;
    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule
            ],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
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

        router = TestBed.inject(Router) as MockedObject<Router>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('ngOnInit without active distribution', () => {
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(null).asReadonly());

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const componentRef = fixture.componentRef;
        const component = fixture.componentInstance;

        // Provide required model inputs before detectChanges
        componentRef.setInput('routeList', { routes: [] });
        componentRef.setInput('carList', { cars: [] });
        componentRef.setInput('foodCategories', []);

        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    });

});
