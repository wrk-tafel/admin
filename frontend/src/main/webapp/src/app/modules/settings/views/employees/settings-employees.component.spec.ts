import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsEmployeesComponent} from './settings-employees.component';
import {EmployeeApiService, EmployeeData, EmployeeListResponse} from '../../../../api/employee-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsEmployeesComponent', () => {
  const testEmployee1: EmployeeData = {
    id: 1,
    personnelNumber: '00001',
    firstname: 'First 1',
    lastname: 'Last 1'
  };
  const testEmployee2: EmployeeData = {
    id: 2,
    personnelNumber: '00002',
    firstname: 'First 2',
    lastname: 'Last 2'
  };
  const listResponse: EmployeeListResponse = {
    items: [testEmployee1, testEmployee2],
    totalCount: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 5
  };

  let employeeApiMock: Partial<EmployeeApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    employeeApiMock = {
      findEmployees: vi.fn(() => of<EmployeeListResponse>(listResponse)),
      updateEmployee: vi.fn(() => of(testEmployee1)),
      saveEmployee: vi.fn(() => of(testEmployee1)),
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    const matDialogMock: Partial<MatDialog> = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: EmployeeApiService, useValue: employeeApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads employees on init', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['employees']()).toBeDefined();
    expect(component['employees']()?.items.length).toBe(2);
    expect(employeeApiMock.findEmployees).toHaveBeenCalledWith(undefined, undefined);
  });

  it('search() reloads from page 1 with the search input', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('00001');
    component['search']();

    expect(employeeApiMock.findEmployees).toHaveBeenCalledWith('00001', 1);
  });

  it('startEdit() enters edit mode for the given row and prefills the fields', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testEmployee1);

    expect(component['editingId']()).toBe(testEmployee1.id);
    expect(component['personnelNumberControl'].value).toBe(testEmployee1.personnelNumber);
    expect(component['firstnameControl'].value).toBe(testEmployee1.firstname);
    expect(component['lastnameControl'].value).toBe(testEmployee1.lastname);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testEmployee1);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(employeeApiMock.updateEmployee).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the changed fields, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testEmployee1);
    component['lastnameControl'].setValue('Updated Last');
    component['saveEdit'](testEmployee1);

    expect(employeeApiMock.updateEmployee).toHaveBeenCalledWith(testEmployee1.id, {
      personnelNumber: testEmployee1.personnelNumber,
      firstname: testEmployee1.firstname,
      lastname: 'Updated Last'
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('addEmployee() creates the employee returned by the dialog and reloads', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const created = {personnelNumber: '00003', firstname: 'First 3', lastname: 'Last 3'};
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as any).mockReturnValueOnce({afterClosed: () => of(created)});

    component['addEmployee']();

    expect(employeeApiMock.saveEmployee).toHaveBeenCalledWith(created);
    expect(toastrMock.success).toHaveBeenCalled();
  });
});
