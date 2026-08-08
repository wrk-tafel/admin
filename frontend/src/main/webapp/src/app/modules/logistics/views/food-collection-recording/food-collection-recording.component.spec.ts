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
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('FoodCollectionRecordingComponent', () => {
    let router: MockedObject<Router>;
    let globalStateService: MockedObject<GlobalStateService>;
    let toastr: MockedObject<TafelToastrService>;
    let matDialog: MockedObject<MatDialog>;

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
                },
                {
                    provide: MatDialog,
                    useValue: { open: vi.fn().mockReturnValue({ afterClosed: () => of(undefined) }) }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router) as MockedObject<Router>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
        matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    }));

    function createSectionStubs(component: any, overrides: {
        basedata?: any;
        km?: any;
        items?: any;
    } = {}) {
        const basedata = {
            markAllAsTouched: vi.fn(),
            hasInvalidInput: vi.fn().mockReturnValue(false),
            saveRequest: vi.fn().mockReturnValue(of(undefined)),
            ...overrides.basedata
        };
        const km = {
            markAllAsTouched: vi.fn(),
            hasInvalidInput: vi.fn().mockReturnValue(false),
            needsKmDifferenceConfirmation: vi.fn().mockReturnValue(false),
            kmDifference: vi.fn().mockReturnValue(100),
            saveRequest: vi.fn().mockReturnValue(of(undefined)),
            ...overrides.km
        };
        const items = {
            markAllAsTouched: vi.fn(),
            hasInvalidInput: vi.fn().mockReturnValue(false),
            saveRequests: vi.fn().mockReturnValue([of(undefined)]),
            ...overrides.items
        };

        component.basedataComponent = () => basedata;
        component.kmComponent = () => km;
        component.itemsDesktopComponent = () => items;
        component.itemsResponsiveComponent = () => items;

        return {basedata, km, items};
    }

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

    it('save - sends base data, km and items in one go regardless of the open tab', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        const stubs = createSectionStubs(component);

        component.save();

        expect(stubs.basedata.saveRequest).toHaveBeenCalled();
        expect(stubs.km.saveRequest).toHaveBeenCalled();
        expect(stubs.items.saveRequests).toHaveBeenCalled();
        expect(toastr.success).toHaveBeenCalledWith('Daten wurden gespeichert!');
    });

    it('save - saves the complete sections and names the ones it skipped', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        const stubs = createSectionStubs(component, {
            basedata: {
                hasInvalidInput: vi.fn().mockReturnValue(true),
                saveRequest: vi.fn().mockReturnValue(null)
            }
        });

        component.save();

        expect(stubs.items.saveRequests).toHaveBeenCalled();
        expect(stubs.basedata.markAllAsTouched).toHaveBeenCalled();
        expect(toastr.warning).toHaveBeenCalledWith(
            'Gespeichert - unvollständig und daher nicht gespeichert: Routendaten'
        );
    });

    it('save - reports an error when nothing can be saved', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {saveRequest: vi.fn().mockReturnValue(null)},
            km: {saveRequest: vi.fn().mockReturnValue(null)},
            items: {saveRequests: vi.fn().mockReturnValue([])}
        });

        component.save();

        expect(toastr.error).toHaveBeenCalledWith('Keine vollständigen Daten zum Speichern!');
    });

    it('save - reports an error when a request fails', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            items: {
                saveRequests: vi.fn().mockReturnValue([throwError(() => new Error('failed'))])
            }
        });

        component.save();

        expect(toastr.error).toHaveBeenCalledWith('Speichern fehlgeschlagen!');
    });

    it('save - asks for confirmation before saving an unusually large km difference', () => {
        matDialog.open.mockReturnValue({afterClosed: () => of(false)} as any);

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        const stubs = createSectionStubs(component, {
            km: {
                needsKmDifferenceConfirmation: vi.fn().mockReturnValue(true),
                kmDifference: vi.fn().mockReturnValue(400)
            }
        });

        component.save();

        expect(matDialog.open).toHaveBeenCalled();
        expect(stubs.items.saveRequests).not.toHaveBeenCalled();
    });

    it('save - proceeds once the km difference is confirmed', () => {
        matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        const stubs = createSectionStubs(component, {
            km: {
                needsKmDifferenceConfirmation: vi.fn().mockReturnValue(true),
                kmDifference: vi.fn().mockReturnValue(400)
            }
        });

        component.save();

        expect(matDialog.open).toHaveBeenCalled();
        expect(stubs.km.saveRequest).toHaveBeenCalled();
        expect(stubs.items.saveRequests).toHaveBeenCalled();
    });

});
