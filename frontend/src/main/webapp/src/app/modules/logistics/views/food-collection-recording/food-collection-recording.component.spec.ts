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
            markAsSaved: vi.fn(),
            tabStatus: vi.fn().mockReturnValue(undefined),
            ...overrides.basedata
        };
        const km = {
            markAllAsTouched: vi.fn(),
            hasInvalidInput: vi.fn().mockReturnValue(false),
            needsKmDifferenceConfirmation: vi.fn().mockReturnValue(false),
            kmDifference: vi.fn().mockReturnValue(100),
            saveRequest: vi.fn().mockReturnValue(of(undefined)),
            markAsSaved: vi.fn(),
            tabStatus: vi.fn().mockReturnValue(undefined),
            ...overrides.km
        };
        const items = {
            markAllAsTouched: vi.fn(),
            hasInvalidInput: vi.fn().mockReturnValue(false),
            saveRequests: vi.fn().mockReturnValue([of(undefined)]),
            markAsSaved: vi.fn(),
            tabStatus: vi.fn().mockReturnValue(undefined),
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

    it('save - marks the completed sections as saved but leaves a skipped one alone', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        const stubs = createSectionStubs(component, {
            basedata: {
                hasInvalidInput: vi.fn().mockReturnValue(true),
                saveRequest: vi.fn().mockReturnValue(null)
            }
        });

        component.save();

        expect(stubs.basedata.markAsSaved).not.toHaveBeenCalled();
        expect(stubs.km.markAsSaved).toHaveBeenCalled();
        expect(stubs.items.markAsSaved).toHaveBeenCalled();
    });

    it('routeTabStatus/warenTabStatus - read the respective sections and combine the "Waren" ones', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue('unsaved')},
            km: {tabStatus: vi.fn().mockReturnValue('complete')},
            items: {tabStatus: vi.fn().mockReturnValue('invalid')}
        });

        expect(component.routeTabStatus()).toBe('unsaved');
        // invalid outranks complete when combining km + items into the one "Waren" badge
        expect(component.warenTabStatus()).toBe('invalid');
    });

    it('basedataMissingWarning - warns once "Waren" has data and "Route" is not complete', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue(undefined)},
            km: {tabStatus: vi.fn().mockReturnValue('complete')}
        });

        expect(component.basedataMissingWarning()).toBe(true);
    });

    it('basedataMissingWarning - does not warn once "Route" is complete too', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue('complete')},
            km: {tabStatus: vi.fn().mockReturnValue('complete')}
        });

        expect(component.basedataMissingWarning()).toBe(false);
    });

    it('basedataMissingWarning - does not warn while "Waren" itself has nothing entered', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue(undefined)},
            km: {tabStatus: vi.fn().mockReturnValue(undefined)}
        });

        expect(component.basedataMissingWarning()).toBe(false);
    });

    it('hasUnsavedChanges/canDeactivate - allows leaving without confirmation when nothing is unsaved', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue('complete')},
            km: {tabStatus: vi.fn().mockReturnValue(undefined)}
        });

        expect(component.hasUnsavedChanges()).toBe(false);
        expect(component.canDeactivate()).toBe(true);
        expect(matDialog.open).not.toHaveBeenCalled();
    });

    it('hasUnsavedChanges/canDeactivate - asks for confirmation and honours the dialog result', () => {
        matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        createSectionStubs(component, {
            basedata: {tabStatus: vi.fn().mockReturnValue('unsaved')}
        });

        expect(component.hasUnsavedChanges()).toBe(true);

        (component.canDeactivate() as any).subscribe((result: boolean) => {
            expect(result).toBe(true);
        });
        expect(matDialog.open).toHaveBeenCalled();
    });

    it('onSelectedRouteChange - clears the selection instead of throwing when "Bitte auswählen" is chosen', () => {
        // Regression test for #3527: the "Bitte auswählen" option's undefined value used to be
        // dereferenced directly, throwing instead of resetting the screen.
        const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
        const component = fixture.componentInstance as any;
        component.selectedRouteData.set({
            route: {id: 1, name: 'Route 1'},
            shops: [],
            foodCollectionData: undefined
        });

        expect(() => component.onSelectedRouteChange(undefined)).not.toThrow();
        expect(component.selectedRouteData()).toBeUndefined();
    });

});
