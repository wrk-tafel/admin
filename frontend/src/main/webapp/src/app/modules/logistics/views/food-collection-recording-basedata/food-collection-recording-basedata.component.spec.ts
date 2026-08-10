import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {FoodCollectionRecordingBasedataComponent} from './food-collection-recording-basedata.component';
import {Router} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {of} from 'rxjs';
import {CarList} from '../../../../api/car-api.service';
import {RouteData} from '../../../../api/route-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {MatDialog} from '@angular/material/dialog';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('FoodCollectionRecordingBasedataComponent', () => {
  let foodCollectionsApiServiceSpy: MockedObject<FoodCollectionsApiService>;
  let employeeApiServiceSpy: MockedObject<EmployeeApiService>;
  let matDialogSpy: MockedObject<MatDialog>;

  beforeEach(() => {
    const employeeApiSpy = {
      findEmployees: vi.fn().mockName('EmployeeApiService.findEmployees'),
      saveEmployee: vi.fn().mockName('EmployeeApiService.saveEmployee')
    } as any;
    // Set default return value to prevent errors in async operations
    employeeApiSpy.findEmployees.mockReturnValue(of({
      items: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    }));

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FoodCollectionRecordingBasedataComponent
      ],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName('Router.navigate')
          }
        },
        {
          provide: GlobalStateService,
          useValue: {
            getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
          }
        },
        {
          provide: FoodCollectionsApiService,
          useValue: {
            saveRouteData: vi.fn().mockName('FoodCollectionsApiService.saveRouteData')
          }
        },
        {
          provide: EmployeeApiService,
          useValue: employeeApiSpy
        },
        {
          // the employee search opens a real dialog on its results, which outlives the fixture
          provide: MatDialog,
          useValue: {open: vi.fn().mockReturnValue({afterClosed: () => of(undefined)})}
        },
        { provide: TafelToastrService, useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() } }
      ]
    }).compileComponents();

    foodCollectionsApiServiceSpy = TestBed.inject(FoodCollectionsApiService) as MockedObject<FoodCollectionsApiService>;
    employeeApiServiceSpy = TestBed.inject(EmployeeApiService) as MockedObject<EmployeeApiService>;
    matDialogSpy = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  });

  const mockEmployees: EmployeeData[] = [
    {
      id: 1,
      personnelNumber: 'D1',
      firstname: 'Driver',
      lastname: 'One',
    },
    {
      id: 2,
      personnelNumber: 'D2',
      firstname: 'Driver',
      lastname: 'Two',
    }
  ];
  const mockEmployeeListResponse: EmployeeListResponse = {
    items: mockEmployees,
    totalCount: mockEmployees.length,
    currentPage: 1,
    totalPages: 1,
    pageSize: mockEmployees.length
  };
  const mockCarList: CarList = {
    cars: [
      {id: 1, name: 'Car 1', licensePlate: 'ABC123', enabled: true, sortOrder: 1},
      {id: 2, name: 'Car 2', licensePlate: 'XYZ789', enabled: true, sortOrder: 2}
    ]
  };
  const mockRoute: RouteData = {id: 123, number: 1, name: 'Test Route', enabled: true, stops: []};
  const mockRouteData: SelectedRouteData = {
    route: mockRoute,
    shops: [],
    foodCollectionData: {
      carId: mockCarList.cars[0].id,
      routeId: mockRoute.id,
      driver: mockEmployees[0],
      coDriver: mockEmployees[1],
      kmStart: 100,
      kmEnd: 200,
      items: [],
      returnItems: []
    }
  };

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should reset and update form when foodCollectionData changes', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    employeeApiServiceSpy.findEmployees.mockReturnValue(of(mockEmployeeListResponse));
    componentRef.setInput('carList', mockCarList);

    // Spy on form controls
    vi.spyOn(component.car, 'reset');
    vi.spyOn(component.driverSearchInput, 'reset');
    vi.spyOn(component.coDriverSearchInput, 'reset');

    // Set initial route data
    componentRef.setInput('selectedRouteData', mockRouteData);

    fixture.detectChanges();

    // Verify reset was called
    expect(component.car.reset).toHaveBeenCalled();
    expect(component.driverSearchInput.reset).toHaveBeenCalled();
    expect(component.coDriverSearchInput.reset).toHaveBeenCalled();

    // Verify form was filled with new values
    expect(component.car.value!.id).toEqual(1);
    expect(component.driverSearchInput.value).toEqual('D1');
    expect(component.coDriverSearchInput.value).toEqual('D2');
  });

  it('should take the stored driver and co-driver over without searching for them again', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', mockRouteData);

    fixture.detectChanges();

    expect(component.selectedDriver()).toEqual(mockEmployees[0]);
    expect(component.selectedCoDriver()).toEqual(mockEmployees[1]);
    expect(component.hasInvalidInput()).toEqual(false);

    // a search would open the select/create dialog whenever the stored personnel number matches
    // several employees or none at all
    expect(employeeApiServiceSpy.findEmployees).not.toHaveBeenCalled();
    expect(matDialogSpy.open).not.toHaveBeenCalled();
  });

  it('should drop the previous driver and co-driver when a route without base data is opened', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', mockRouteData);

    fixture.detectChanges();

    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      route: {...mockRoute, id: 456},
      foodCollectionData: null
    });

    fixture.detectChanges();

    expect(component.selectedDriver()).toBeNull();
    expect(component.selectedCoDriver()).toBeNull();
    expect(component.driverSearchInput.value).toBeNull();
    expect(component.coDriverSearchInput.value).toBeNull();
    expect(component.car.value).toBeNull();
  });

  it('should trigger search for driver and co-driver when input exists', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;

    // Mock the child components
    // Mock the viewChild signals to return the mock objects
    const mockDriverSearch = {
      triggerSearch: vi.fn().mockName('TafelEmployeeSearchCreateComponent.triggerSearch')
    } as any;
    const mockCoDriverSearch = {
      triggerSearch: vi.fn().mockName('TafelEmployeeSearchCreateComponent.triggerSearch')
    } as any;

    // Override the viewChild signals with functions that return mocks
    (component as any).driverEmployeeSearchCreate = () => mockDriverSearch;
    (component as any).coDriverEmployeeSearchCreate = () => mockCoDriverSearch;

    // Test driver search with no input
    component.driverSearchInput.setValue(null);
    component.triggerSearchDriver();
    expect(mockDriverSearch.triggerSearch).not.toHaveBeenCalled();

    // Test driver search with input
    component.driverSearchInput.setValue('D1');
    component.triggerSearchDriver();
    expect(mockDriverSearch.triggerSearch).toHaveBeenCalled();

    // Test co-driver search with no input
    component.coDriverSearchInput.setValue(null);
    component.triggerSearchCoDriver();
    expect(mockCoDriverSearch.triggerSearch).not.toHaveBeenCalled();

    // Test co-driver search with input
    component.coDriverSearchInput.setValue('D2');
    component.triggerSearchCoDriver();
    expect(mockCoDriverSearch.triggerSearch).toHaveBeenCalled();
  });

  it('should report invalid input until car, driver and co-driver are set', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    fixture.detectChanges();

    // Initially the form should be invalid (no data entered)
    expect(component.hasInvalidInput()).toEqual(true);

    component.car.setValue(mockCarList.cars[0]);
    component.driverSearchInput.setValue('D1');
    component.coDriverSearchInput.setValue('D2');

    // But still no actual driver and co-driver selected
    expect(component.hasInvalidInput()).toEqual(true);

    component.setSelectedDriver(mockEmployees[0]);
    component.setSelectedCoDriver(mockEmployees[1]);

    expect(component.hasInvalidInput()).toEqual(false);

    component.car.setValue(null);
    expect(component.hasInvalidInput()).toEqual(true);
  });

  it('should reset driver when resetDriver is called', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    fixture.detectChanges();

    // Set a driver
    component.driverSearchInput.setValue('D1');
    component.setSelectedDriver(mockEmployees[0]);

    expect(component.driverSearchInput.value).toEqual('D1');
    expect(component.selectedDriver()).toEqual(mockEmployees[0]);

    // Reset driver
    component.resetDriver();

    expect(component.driverSearchInput.value).toBeNull();
    expect(component.selectedDriver()).toBeNull();
  });

  it('should reset co-driver when resetCoDriver is called', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    fixture.detectChanges();

    // Set a co-driver
    component.coDriverSearchInput.setValue('D2');
    component.setSelectedCoDriver(mockEmployees[1]);

    expect(component.coDriverSearchInput.value).toEqual('D2');
    expect(component.selectedCoDriver()).toEqual(mockEmployees[1]);

    // Reset co-driver
    component.resetCoDriver();

    expect(component.coDriverSearchInput.value).toBeNull();
    expect(component.selectedCoDriver()).toBeNull();
  });

  it('should provide a save request once the base data is complete', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', mockRouteData);

    fixture.detectChanges();

    foodCollectionsApiServiceSpy.saveRouteData.mockReturnValue(of(undefined));

    component.car.setValue(mockCarList.cars[0]);
    component.driverSearchInput.setValue('D1');
    component.setSelectedDriver(mockEmployees[0]);
    component.coDriverSearchInput.setValue('D2');
    component.setSelectedCoDriver(mockEmployees[1]);

    expect(component.saveRequest()).not.toBeNull();
    expect(foodCollectionsApiServiceSpy.saveRouteData).toHaveBeenCalledWith(123, {
      carId: 1,
      driverId: 1,
      coDriverId: 2
    });
  });

  it('should not provide a save request while the base data is incomplete', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    fixture.detectChanges();

    component.car.setValue(mockCarList.cars[0]);

    expect(component.saveRequest()).toBeNull();
    expect(foodCollectionsApiServiceSpy.saveRouteData).not.toHaveBeenCalled();
  });

});
