import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SettingsCarsComponent} from './settings-cars.component';
import {CarApiService, CarData, CarList} from '../../../../api/car-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {LiveAnnouncer} from '@angular/cdk/a11y';

describe('SettingsCarsComponent', () => {
  const testCar1: CarData = {
    id: 1,
    licensePlate: 'W-123',
    name: 'Car 123',
    enabled: true,
    sortOrder: 1
  };
  const testCar2: CarData = {
    id: 2,
    licensePlate: 'W-456',
    name: 'Car 456',
    enabled: true,
    sortOrder: 2
  };

  const disabledCar: CarData = {
    id: 3,
    licensePlate: 'W-789',
    name: 'Car 789',
    enabled: false,
    sortOrder: 3
  };

  let carApiMock: Partial<CarApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let liveAnnouncerMock: Partial<LiveAnnouncer>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    carApiMock = {
      getAllCars: vi.fn(() => of<CarList>({cars: [testCar1, testCar2]})),
      updateCar: vi.fn(() => of(testCar1)),
      createCar: vi.fn(() => of(testCar1)),
      reorderCars: vi.fn(() => of<CarList>({cars: [testCar2, testCar1]})),
      deleteCar: vi.fn(() => of(undefined))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    liveAnnouncerMock = {
      announce: vi.fn(() => Promise.resolve())
    };

    matDialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: CarApiService, useValue: carApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock},
        {provide: LiveAnnouncer, useValue: liveAnnouncerMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads cars on init', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['cars']()).toBeDefined();
    expect(component['cars']()?.cars.length).toBe(2);
  });

  it('startEdit() enters edit mode for the given row and prefills the fields', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCar1);

    expect(component['editingId']()).toBe(testCar1.id);
    expect(component['licensePlateControl'].value).toBe(testCar1.licensePlate);
    expect(component['nameControl'].value).toBe(testCar1.name);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCar1);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(carApiMock.updateCar).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the changed fields, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCar1);
    component['nameControl'].setValue('Updated Name');
    component['saveEdit'](testCar1);

    expect(carApiMock.updateCar).toHaveBeenCalledWith(testCar1.id, {
      ...testCar1,
      name: 'Updated Name'
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('toggleCarVisibility() updates enabled flag', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleCarVisibility'](testCar1, false);

    expect(carApiMock.updateCar).toHaveBeenCalledWith(testCar1.id, {
      ...testCar1,
      enabled: false
    });
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('drop() reorders optimistically and persists the new order', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<CarData[]>;
    component['drop'](event);

    expect(component['cars']()?.cars.map(c => c.id)).toEqual([testCar2.id, testCar1.id]);
    expect(carApiMock.reorderCars).toHaveBeenCalledWith([testCar2.id, testCar1.id]);
  });

  it('moveCar() persists the new order and announces the new position', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['moveCar'](0, 1);

    expect(component['cars']()?.cars.map(c => c.id)).toEqual([testCar2.id, testCar1.id]);
    expect(carApiMock.reorderCars).toHaveBeenCalledWith([testCar2.id, testCar1.id]);
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith('Fahrzeug Car 123 ist jetzt an Position 2 von 2.', 'assertive');
  });

  it('moveCar() past either end of the list changes nothing', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['moveCar'](0, -1);
    component['moveCar'](1, 1);

    expect(component['cars']()?.cars.map(c => c.id)).toEqual([testCar1.id, testCar2.id]);
    expect(carApiMock.reorderCars).not.toHaveBeenCalled();
    expect(liveAnnouncerMock.announce).not.toHaveBeenCalled();
  });

  it('the status filter narrows the list to the active or the deactivated cars', () => {
    carApiMock.getAllCars = vi.fn(() => of<CarList>({cars: [testCar1, disabledCar, testCar2]}));

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleCars']().map(car => car.id)).toEqual([testCar1.id, disabledCar.id, testCar2.id]);
    expect(component['enabledCount']()).toBe(2);
    expect(component['totalCount']()).toBe(3);

    component['onFilterChanged']('ENABLED');
    expect(component['visibleCars']().map(car => car.id)).toEqual([testCar1.id, testCar2.id]);

    component['onFilterChanged']('DISABLED');
    expect(component['visibleCars']().map(car => car.id)).toEqual([disabledCar.id]);
  });

  it('moveCar() counts the displayed positions and jumps over a car the filter hides', () => {
    carApiMock.getAllCars = vi.fn(() => of<CarList>({cars: [testCar1, disabledCar, testCar2]}));

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['onFilterChanged']('ENABLED');

    component['moveCar'](0, 1);

    // the hidden car keeps its place, and the whole list is sent so the backend renumbers all of it
    expect(carApiMock.reorderCars).toHaveBeenCalledWith([disabledCar.id, testCar2.id, testCar1.id]);
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith('Fahrzeug Car 123 ist jetzt an Position 2 von 2.', 'assertive');
  });

  it('uppercaseLicensePlate() normalizes the case of an inline edit while typing', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['licensePlateControl'].setValue('w-123x');
    component['uppercaseLicensePlate']();

    expect(component['licensePlateControl'].value).toBe('W-123X');
  });

  it('saveEdit() normalizes the license plate and trims the name', () => {
    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCar1);
    component['licensePlateControl'].setValue(' w-123x ');
    component['nameControl'].setValue(' Updated Name ');
    component['saveEdit'](testCar1);

    expect(carApiMock.updateCar).toHaveBeenCalledWith(testCar1.id, {
      ...testCar1,
      licensePlate: 'W-123X',
      name: 'Updated Name'
    });
  });

  it('addCar() creates the car the dialog returned', () => {
    const newCar: CarData = {id: 0, licensePlate: 'W-999', name: 'New Car', enabled: true, sortOrder: 0};
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of({create: newCar})})) as any;

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCar']();

    expect(carApiMock.createCar).toHaveBeenCalledWith(newCar);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('addCar() re-enables the existing car instead of creating a duplicate', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of({reactivate: disabledCar})})) as any;

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCar']();

    expect(carApiMock.createCar).not.toHaveBeenCalled();
    expect(carApiMock.updateCar).toHaveBeenCalledWith(disabledCar.id, {...disabledCar, enabled: true});
  });

  it('addCar() hands the dialog every car, so it can spot a deactivated duplicate', () => {
    carApiMock.getAllCars = vi.fn(() => of<CarList>({cars: [testCar1, disabledCar]}));

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCar']();

    expect(matDialogMock.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: {existingCars: [testCar1, disabledCar]}
    }));
  });

  it('drop() reverts and shows an error toast when persisting fails', () => {
    carApiMock.reorderCars = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<CarData[]>;
    component['drop'](event);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(carApiMock.getAllCars).toHaveBeenCalledTimes(2);
  });

  it('deleteCar() deletes the car and reloads once the confirm dialog is accepted', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(true)})) as any;

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteCar'](testCar1);

    expect(matDialogMock.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: {carName: testCar1.name}
    }));
    expect(carApiMock.deleteCar).toHaveBeenCalledWith(testCar1.id);
    expect(toastrMock.success).toHaveBeenCalled();
    expect(carApiMock.getAllCars).toHaveBeenCalledTimes(2);
  });

  it('deleteCar() does nothing when the confirm dialog is cancelled', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(undefined)})) as any;

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteCar'](testCar1);

    expect(carApiMock.deleteCar).not.toHaveBeenCalled();
  });

  it('deleteCar() shows an error toast when the car is still in use', () => {
    carApiMock.deleteCar = vi.fn(() => throwError(() => new Error('failed')));
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(true)})) as any;

    const fixture = TestBed.createComponent(SettingsCarsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteCar'](testCar1);

    expect(toastrMock.error).toHaveBeenCalled();
  });

});
