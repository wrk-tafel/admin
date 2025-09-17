import {TestBed} from '@angular/core/testing';
import {FoodCollectionRecordingBasedataComponent} from './food-collection-recording-basedata.component';
import {Router} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {of} from 'rxjs';
import {CarList} from '../../../../api/car-api.service';
import {RouteData} from '../../../../api/route-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {provideZonelessChangeDetection} from "@angular/core";
import {provideNoopAnimations} from "@angular/platform-browser/animations";

describe('FoodCollectionRecordingBasedataComponent', () => {
  let foodCollectionsApiServiceSpy: jasmine.SpyObj<FoodCollectionsApiService>;
  let employeeApiServiceSpy: jasmine.SpyObj<EmployeeApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideZonelessChangeDetection(),
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        },
        {
          provide: FoodCollectionsApiService,
          useValue: jasmine.createSpyObj('FoodCollectionsApiService', ['saveRouteData'])
        },
        {
          provide: EmployeeApiService,
          useValue: jasmine.createSpyObj('EmployeeApiService', ['findEmployees', 'saveEmployee'])
        }
      ]
    }).compileComponents();

    foodCollectionsApiServiceSpy = TestBed.inject(FoodCollectionsApiService) as jasmine.SpyObj<FoodCollectionsApiService>;
    employeeApiServiceSpy = TestBed.inject(EmployeeApiService) as jasmine.SpyObj<EmployeeApiService>;
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
      {id: 1, name: 'Car 1', licensePlate: 'ABC123'},
      {id: 2, name: 'Car 2', licensePlate: 'XYZ789'}
    ]
  };
  const mockRoute: RouteData = {id: 123, name: 'Test Route'};
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
      items: []
    }
  };

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should reset and update form when foodCollectionData changes', async () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    employeeApiServiceSpy.findEmployees.and.returnValue(of(mockEmployeeListResponse));
    componentRef.setInput('carList', mockCarList);

    // Spy on form controls
    spyOn(component.car, 'reset').and.callThrough();
    spyOn(component.kmStart, 'reset').and.callThrough();
    spyOn(component.kmEnd, 'reset').and.callThrough();
    spyOn(component.driverSearchInput, 'reset').and.callThrough();
    spyOn(component.coDriverSearchInput, 'reset').and.callThrough();

    // Set initial route data
    componentRef.setInput('selectedRouteData', mockRouteData);

    await fixture.whenStable();

    // Verify reset was called
    expect(component.car.reset).toHaveBeenCalled();
    expect(component.kmStart.reset).toHaveBeenCalled();
    expect(component.kmEnd.reset).toHaveBeenCalled();
    expect(component.driverSearchInput.reset).toHaveBeenCalled();
    expect(component.coDriverSearchInput.reset).toHaveBeenCalled();

    // Verify form was filled with new values
    expect(component.car.value.id).toEqual(1);
    expect(component.driverSearchInput.value).toEqual('D1');
    expect(component.coDriverSearchInput.value).toEqual('D2');
    expect(component.kmStart.value).toEqual(100);
    expect(component.kmEnd.value).toEqual(200);
  });

  it('should validate km values - end km must be greater than start km', async () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    await fixture.whenStable();

    // Set car
    component.car.setValue(mockCarList.cars[0]);

    // Test valid scenario - end km > start km
    component.kmStart.setValue(100);
    component.kmEnd.setValue(150);
    await fixture.whenStable();

    expect(component.kmEnd.errors).toBeFalsy();

    // Test invalid scenario - start km > end km
    component.kmStart.setValue(200);
    component.kmEnd.setValue(150);
    await fixture.whenStable();

    expect(component.kmEnd.errors).toBeTruthy();
    expect(component.kmEnd.errors['kmValidation']).toBeTrue();

    // Test invalid scenario - start km = end km
    component.kmStart.setValue(150);
    component.kmEnd.setValue(150);
    await fixture.whenStable();

    expect(component.kmEnd.errors).toBeTruthy();
    expect(component.kmEnd.errors['kmValidation']).toBeTrue();
  });

  it('should trigger search for driver and co-driver when input exists', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;

    // Mock the child components
    component.driverEmployeeSearchCreate = jasmine.createSpyObj('TafelEmployeeSearchCreateComponent', ['triggerSearch']);
    component.coDriverEmployeeSearchCreate = jasmine.createSpyObj('TafelEmployeeSearchCreateComponent', ['triggerSearch']);

    // Test driver search with no input
    component.driverSearchInput.setValue(null);
    component.triggerSearchDriver();
    expect(component.driverEmployeeSearchCreate.triggerSearch).not.toHaveBeenCalled();

    // Test driver search with input
    component.driverSearchInput.setValue('D1');
    component.triggerSearchDriver();
    expect(component.driverEmployeeSearchCreate.triggerSearch).toHaveBeenCalled();

    // Test co-driver search with no input
    component.coDriverSearchInput.setValue(null);
    component.triggerSearchCoDriver();
    expect(component.coDriverEmployeeSearchCreate.triggerSearch).not.toHaveBeenCalled();

    // Test co-driver search with input
    component.coDriverSearchInput.setValue('D2');
    component.triggerSearchCoDriver();
    expect(component.coDriverEmployeeSearchCreate.triggerSearch).toHaveBeenCalled();
  });

  it('should correctly determine if save is disabled based on form state', async () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('carList', mockCarList);
    componentRef.setInput('selectedRouteData', {
      ...mockRouteData,
      foodCollectionData: null
    });

    await fixture.whenStable();

    // Initially the form should be invalid (no data entered)
    expect(component.isSaveDisabled()).toEqual(true);

    // Set valid car
    component.car.setValue(mockCarList.cars[0]);
    // Set valid km values
    component.kmStart.setValue(100);
    component.kmEnd.setValue(150);
    // Set valid driver input
    component.driverSearchInput.setValue('D1');
    // Set valid co-driver input
    component.coDriverSearchInput.setValue('D2');

    // But still no actual driver and co-driver selected
    expect(component.isSaveDisabled()).toEqual(true);

    // Set driver and co-driver
    const mockDriver = mockEmployees[0];
    const mockCoDriver = mockEmployees[1];
    component.setSelectedDriver(mockDriver);
    component.setSelectedCoDriver(mockCoDriver);

    // Now everything should be valid
    expect(component.isSaveDisabled()).toEqual(false);

    // If we make one field invalid, save should be disabled
    component.kmEnd.setValue(null);
    expect(component.isSaveDisabled()).toEqual(true);
  });

  // TODO test resetDriver

  // TODO test resetCoDriver

  // TODO test prefill of existing data

  // TODO test save

});
