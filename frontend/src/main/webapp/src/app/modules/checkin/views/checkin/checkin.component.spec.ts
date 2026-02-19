import type {MockedObject} from "vitest";
import {TestBed} from '@angular/core/testing';
import {CheckinComponent, CustomerState, ScanResult} from './checkin.component';
import {CommonModule} from '@angular/common';
// eslint-disable-next-line deprecation/deprecation
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {CustomerApiService, Gender} from '../../../../api/customer-api.service';
import {EMPTY, of, throwError} from 'rxjs';
import moment from 'moment';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../../api/customer-note-api.service';
import {Router} from '@angular/router';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {BadgeModule, CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {FormsModule} from '@angular/forms';
import {ChangeDetectorRef, signal} from '@angular/core';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {ScannerApiService, ScannerList} from '../../../../api/scanner-api.service';
import {SseService} from '../../../../common/sse/sse.service';

describe('CheckinComponent', () => {
    let customerApiService: MockedObject<CustomerApiService>;
    let customerNoteApiService: MockedObject<CustomerNoteApiService>;
    let scannerApiService: MockedObject<ScannerApiService>;
    let sseService: MockedObject<SseService>;
    let globalStateService: MockedObject<GlobalStateService>;
    let distributionApiService: MockedObject<DistributionApiService>;
    let distributionTicketApiService: MockedObject<DistributionTicketApiService>;
    let router: MockedObject<Router>;
    let toastService: MockedObject<ToastService>;

    beforeEach(() => {
        const customerApiServiceSpy = {
            getCustomer: vi.fn().mockName("CustomerApiService.getCustomer")
        };
        const customerNoteApiServiceSpy = {
            getNotesForCustomer: vi.fn().mockName("CustomerNoteApiService.getNotesForCustomer")
        };
        const scannerApiServiceSpy = {
            getScanners: vi.fn().mockName("ScannerApiService.getScanners").mockReturnValue(of({ scannerIds: [] }))
        };
        const sseServiceSpy = {
            listen: vi.fn().mockName("SseService.listen")
        };
        const defaultDistribution: DistributionItem = {
            id: 1,
            startedAt: new Date()
        };
        const globalStateServiceSpy = {
            getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution").mockReturnValue(signal<DistributionItem>(defaultDistribution).asReadonly())
        };
        const distributionApiServiceSpy = {
            assignCustomer: vi.fn().mockName("DistributionApiService.assignCustomer")
        };
        const distributionTicketApiServiceSpy = {
            getCurrentTicketForCustomer: vi.fn().mockName("DistributionTicketApiService.getCurrentTicketForCustomer"),
            deleteCurrentTicketOfCustomer: vi.fn().mockName("DistributionTicketApiService.deleteCurrentTicketOfCustomer")
        };
        const routerSpy = {
            navigate: vi.fn().mockName("Router.navigate")
        };
        const toastServiceSpy = {
            showToast: vi.fn().mockName("ToastService.showToast")
        };

        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                ModalModule,
                RowComponent,
                ColComponent,
                CardModule,
                BadgeModule
            ],
            providers: [
                // Required for CoreUI components that use animations (e.g., ModalComponent with @fadeInOut)
                // Though deprecated in Angular 20.2, still needed until CoreUI migrates to CSS animations
                // eslint-disable-next-line deprecation/deprecation
                provideNoopAnimations(),
                {
                    provide: CustomerApiService,
                    useValue: customerApiServiceSpy
                },
                {
                    provide: CustomerNoteApiService,
                    useValue: customerNoteApiServiceSpy
                },
                {
                    provide: ScannerApiService,
                    useValue: scannerApiServiceSpy
                },
                {
                    provide: SseService,
                    useValue: sseServiceSpy
                },
                {
                    provide: GlobalStateService,
                    useValue: globalStateServiceSpy
                },
                {
                    provide: DistributionApiService,
                    useValue: distributionApiServiceSpy
                },
                {
                    provide: DistributionTicketApiService,
                    useValue: distributionTicketApiServiceSpy
                },
                {
                    provide: Router,
                    useValue: routerSpy
                },
                {
                    provide: ToastService,
                    useValue: toastServiceSpy
                }
            ]
        }).compileComponents();

        customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        customerNoteApiService = TestBed.inject(CustomerNoteApiService) as MockedObject<CustomerNoteApiService>;
        scannerApiService = TestBed.inject(ScannerApiService) as MockedObject<ScannerApiService>;
        sseService = TestBed.inject(SseService) as MockedObject<SseService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
        distributionTicketApiService = TestBed.inject(DistributionTicketApiService) as MockedObject<DistributionTicketApiService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
    });

    it('component can be created', () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        expect(component).toBeTruthy();
    });

    it('ngOnInit', async () => {
        const scannersResponse: ScannerList = { scannerIds: [1, 2, 3] };
        scannerApiService.getScanners.mockReturnValue(of(scannersResponse));

        const testDistribution: DistributionItem = {
            id: 123,
            startedAt: new Date()
        };
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(testDistribution).asReadonly());

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        await fixture.whenStable();

        expect(component.scannerIds).toEqual(scannersResponse.scannerIds);
    });

    it('ngOnInit without ongoing distribution navigates to dashboard', () => {
        scannerApiService.getScanners.mockReturnValue(EMPTY);
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(null).asReadonly());

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        fixture.detectChanges();

        expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    });

    it('ngOnDestroy with active subscription', () => {
        const testSubscription = {
            unsubscribe: vi.fn().mockName("Subscription.unsubscribe")
        } as any;

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        component.scannerSubscription = testSubscription;

        // Trigger destroyRef cleanup by destroying the fixture
        fixture.destroy();

        expect(component.scannerSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('selectedScannerId first time selected', () => {
        customerApiService.getCustomer.mockReturnValue(EMPTY);
        customerNoteApiService.getNotesForCustomer.mockReturnValue(EMPTY);

        const customerId = 11111;
        const scanResult: ScanResult = { value: customerId };
        sseService.listen.mockReturnValue(of(scanResult));

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        expect(component.currentScannerId).toBeUndefined();
        expect(component.customerId).toBeUndefined();
        expect(component.scannerReadyState).toBeFalsy();

        const newScannerId = 123;
        component.selectedScannerId = newScannerId;

        expect(component.currentScannerId).toBe(newScannerId);
        expect(component.customerId).toBe(customerId);
        expect(component.scannerReadyState).toBeTruthy();
        expect(sseService.listen).toHaveBeenCalledWith(`/sse/scanners/${newScannerId}/results`);
        expect(customerApiService.getCustomer).toHaveBeenCalled();
    });

    it('selectedScannerId removed scanner', () => {
        const testSubscription = {
            unsubscribe: vi.fn().mockName("Subscription.unsubscribe")
        } as any;

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        component.currentScannerId = 123;
        component.customerId = 1111;
        component.scannerReadyState = true;
        component.scannerSubscription = testSubscription;

        component.selectedScannerId = undefined;

        expect(component.currentScannerId).toBeUndefined();
        expect(component.customerId).not.toBeUndefined();
        expect(component.scannerReadyState).toBeFalsy();
        expect(testSubscription.unsubscribe).toHaveBeenCalled();
        expect(sseService.listen).not.toHaveBeenCalled();
        expect(customerApiService.getCustomer).not.toHaveBeenCalled();
    });

    it('selectedScannerId switch to another scanner', () => {
        const testSubscription = {
            unsubscribe: vi.fn().mockName("Subscription.unsubscribe")
        } as any;
        sseService.listen.mockReturnValue(EMPTY);

        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        component.currentScannerId = 123;
        component.customerId = 1111;
        component.scannerReadyState = true;
        component.scannerSubscription = testSubscription;

        const newScannerId = 456;
        component.selectedScannerId = newScannerId;

        expect(component.currentScannerId).toBe(newScannerId);
        expect(component.scannerReadyState).toBeTruthy();
        expect(testSubscription.unsubscribe).toHaveBeenCalled();
        expect(sseService.listen).toHaveBeenCalledWith(`/sse/scanners/${newScannerId}/results`);
    });

    it('searchForCustomerId found valid customer', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        component.ticketNumber = 123;

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        component.customerId = mockCustomer.id;
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: null
        }));

        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customer()).toEqual(mockCustomer);
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

        expect(component.customerState()).toBe(CustomerState.VALID);
        expect(component.customerStateText()).toBe('GÜLTIG');

        expect(component.ticketNumber).toBeUndefined();
        expect(component.ticketNumberEdit).toBe(false);
    });

    it('searchForCustomerId found valid customer with assigned ticket', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        component.ticketNumber = 123;

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        component.customerId = mockCustomer.id;

        const testTicketNumber = 123;
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: testTicketNumber
        }));

        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customer()).toEqual(mockCustomer);
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

        expect(component.customerState()).toBe(CustomerState.VALID);
        expect(component.customerStateText()).toBe('GÜLTIG');

        expect(component.ticketNumber).toBe(testTicketNumber);
        expect(component.ticketNumberEdit).toBe(true);
    });

    it('searchForCustomerId found valid customer but expires soon', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(2, 'weeks').startOf('day').utc().toDate()
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        component.customerId = mockCustomer.id;
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: null
        }));

        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customer()).toEqual(mockCustomer);
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

        expect(component.customerState()).toBe(CustomerState.VALID_WARN);
        expect(component.customerStateText()).toBe('GÜLTIG - läuft bald ab');
    });

    it('searchForCustomerId found invalid customer', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().subtract(2, 'weeks').startOf('day').utc().toDate()
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        component.customerId = mockCustomer.id;
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: null
        }));

        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customer()).toEqual(mockCustomer);
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

        expect(component.customerState()).toBe(CustomerState.INVALID);
        expect(component.customerStateText()).toBe('UNGÜLTIG');
    });

    it('searchForCustomerId found locked customer', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,
            locked: true,

            validUntil: moment().subtract(2, 'weeks').startOf('day').utc().toDate()
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        component.customerId = mockCustomer.id;
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: null
        }));

        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customer()).toEqual(mockCustomer);
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

        expect(component.customerState()).toBe(CustomerState.LOCKED);
        expect(component.customerStateText()).toBe('GESPERRT');
    });

    it('searchForCustomerId customer not found', () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        customerApiService.getCustomer.mockReturnValue(throwError(() => {
            return { status: 404 };
        }));
        const notesResponse: CustomerNotesResponse = {
            items: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(notesResponse));
        const testCustomerId = 1234;
        component.customerId = testCustomerId;

        component.searchForCustomerId();

        expect(component.customer()).toBeUndefined();
        expect(customerApiService.getCustomer).toHaveBeenCalledWith(testCustomerId);
    });

    it('searchForCustomerId found notes', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        customerApiService.getCustomer.mockReturnValue(of(mockCustomer));

        const mockNotesResponse: CustomerNotesResponse = {
            items: [
                {
                    author: 'author1',
                    timestamp: moment('2023-03-22T19:45:25.615477+01:00').toDate(),
                    note: 'note from author 2'
                },
                {
                    author: 'author2',
                    timestamp: moment('2023-03-20T19:45:25.615477+01:00').toDate(),
                    note: 'note from author 1'
                }
            ],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            pageSize: 5
        };
        customerNoteApiService.getNotesForCustomer.mockReturnValue(of(mockNotesResponse));
        distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({
            ticketNumber: null
        }));

        component.customerId = mockCustomer.id;
        component.searchForCustomerId();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customerNotes).toEqual(mockNotesResponse.items);
    });

    it('reset customer', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        fixture.detectChanges();  // Populate ViewChildren from template

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        component.processCustomer(mockCustomer);

        component.cancel();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.customerId).toBeUndefined();
        expect(component.customerState()).toBeUndefined();
        expect(component.customerStateText()).toBeNull();
        expect(component.customerNotes).toBeDefined();
        expect(component.customerNotes.length).toBe(0);
    });

    it('assign customer', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];
        fixture.detectChanges();  // Populate ViewChildren from template

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        component.processCustomer(mockCustomer);

        const ticketNumber = 55;
        component.ticketNumber = ticketNumber;

        distributionApiService.assignCustomer.mockReturnValue(of(null));

        component.assignCustomer();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(distributionApiService.assignCustomer).toHaveBeenCalledWith(mockCustomer.id, ticketNumber);

        expect(component.customerId).toBeUndefined();
        expect(component.customerState()).toBeUndefined();
        expect(component.customerStateText()).toBeNull();
        expect(component.customerNotes).toBeDefined();
        expect(component.customerNotes.length).toBe(0);
        expect(component.ticketNumber).toBeUndefined();
    });

    it('assign customer ignored without proper value', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        component.processCustomer(mockCustomer);

        component.ticketNumber = undefined;

        component.assignCustomer();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(distributionApiService.assignCustomer).not.toHaveBeenCalled();
    });

    it('delete ticket successful', async () => {
        const fixture = TestBed.createComponent(CheckinComponent);
        const component = fixture.componentInstance;
        component.customerNotes = [];

        const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
        vi.spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

        const mockCustomer = {
            id: 133,
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,

            validUntil: moment().add(3, 'months').startOf('day').utc().toDate(),
            additionalPersons: []
        };
        component.processCustomer(mockCustomer);
        distributionTicketApiService.deleteCurrentTicketOfCustomer.mockImplementation((id) =>
            id === mockCustomer.id ? of(null) : of(null)
        );

        component.deleteTicket();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(distributionTicketApiService.deleteCurrentTicketOfCustomer).toHaveBeenCalledWith(mockCustomer.id);
        expect(component.ticketNumber).toBeUndefined();
        expect(component.ticketNumberEdit).toBeUndefined();
        expect(toastService.showToast).toHaveBeenCalledWith({ type: ToastType.SUCCESS, title: 'Ticket-Nummer gelöscht!' });
    });

});
