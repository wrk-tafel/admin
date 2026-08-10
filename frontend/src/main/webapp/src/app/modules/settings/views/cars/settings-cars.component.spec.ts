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

  let carApiMock: Partial<CarApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let liveAnnouncerMock: Partial<LiveAnnouncer>;

  beforeEach(() => {
    carApiMock = {
      getAllCars: vi.fn(() => of<CarList>({cars: [testCar1, testCar2]})),
      updateCar: vi.fn(() => of(testCar1)),
      createCar: vi.fn(() => of(testCar1)),
      reorderCars: vi.fn(() => of<CarList>({cars: [testCar2, testCar1]}))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    liveAnnouncerMock = {
      announce: vi.fn(() => Promise.resolve())
    };

    const matDialogMock: Partial<MatDialog> = {
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

});
