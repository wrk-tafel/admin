import {TestBed} from '@angular/core/testing';
import {HttpHeaders, HttpResponse, provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {SettingsEmployeesComponent} from './settings-employees.component';
import {
  EmployeeApiService,
  EmployeeData,
  EmployeeListResponse,
  PersonnelNumberAvailabilityResponse
} from '../../../../api/employee-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {EmployeeCreateDialogResult} from './dialogs/employee-create-dialog.component';

describe('SettingsEmployeesComponent', () => {
  const testEmployee1: EmployeeData = {
    id: 1,
    personnelNumber: '00001',
    firstname: 'First 1',
    lastname: 'Last 1',
    userAccount: {id: 7, username: 'user-7'}
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
  let fileHelperMock: Partial<FileHelperService>;
  let permissions: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    permissions = ['SETTINGS', 'USER_MANAGEMENT'];

    employeeApiMock = {
      findEmployees: vi.fn(() => of<EmployeeListResponse>(listResponse)),
      updateEmployee: vi.fn(() => of(testEmployee1)),
      saveEmployee: vi.fn(() => of(testEmployee1)),
      deleteEmployee: vi.fn(() => of(undefined)),
      checkPersonnelNumberAvailability: vi.fn(() => of<PersonnelNumberAvailabilityResponse>({available: true})),
      exportEmployee: vi.fn(),
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    fileHelperMock = {
      downloadFile: vi.fn()
    };

    const matDialogMock: Partial<MatDialog> = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: EmployeeApiService, useValue: employeeApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock},
        {provide: FileHelperService, useValue: fileHelperMock},
        {
          provide: AuthenticationService,
          useValue: {hasPermission: (permission: string) => permissions.includes(permission)}
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    expect(employeeApiMock.findEmployees).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(component['searchAnnouncement']()).toBe('2 Mitarbeiter gefunden');
  });

  it('searches from page 1 while the search input is typed, once the typing settles', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('0000');
    component['searchControl'].setValue('00001');
    expect(employeeApiMock.findEmployees).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);

    expect(employeeApiMock.findEmployees).toHaveBeenCalledWith('00001', 1, listResponse.pageSize);
    expect(employeeApiMock.findEmployees).toHaveBeenCalledTimes(2);
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

  it('reports a personnel number already given out while it is typed and refuses to save it', () => {
    (employeeApiMock.checkPersonnelNumberAvailability as any).mockReturnValue(
      of<PersonnelNumberAvailabilityResponse>({available: false, existingEmployee: testEmployee2})
    );

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testEmployee1);
    component['personnelNumberControl'].setValue('00002');
    vi.advanceTimersByTime(500);

    expect(employeeApiMock.checkPersonnelNumberAvailability).toHaveBeenCalledWith('00002', testEmployee1.id);
    expect(component['editDuplicate']()).toEqual(testEmployee2);
    expect(component['personnelNumberControl'].errors).toEqual({duplicateEmployee: true});

    component['saveEdit'](testEmployee1);

    expect(employeeApiMock.updateEmployee).not.toHaveBeenCalled();
  });

  it('openEmployee() narrows the list to the employee holding the number and edits it', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['openEmployee'](testEmployee2);

    expect(component['searchControl'].value).toBe(testEmployee2.personnelNumber);
    expect(employeeApiMock.findEmployees).toHaveBeenCalledWith(testEmployee2.personnelNumber, 1, listResponse.pageSize);
    expect(component['editingId']()).toBe(testEmployee2.id);
  });

  it('addEmployee() creates the employee returned by the dialog and reloads', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const created = {personnelNumber: '00003', firstname: 'First 3', lastname: 'Last 3'};
    const result: EmployeeCreateDialogResult = {type: 'create', employee: created};
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as any).mockReturnValueOnce({afterClosed: () => of(result)});

    component['addEmployee']();

    expect(employeeApiMock.saveEmployee).toHaveBeenCalledWith(created);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('addEmployee() opens the colliding employee when the dialog closes with one', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const result: EmployeeCreateDialogResult = {type: 'openExisting', employee: testEmployee2};
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as any).mockReturnValueOnce({afterClosed: () => of(result)});

    component['addEmployee']();

    expect(employeeApiMock.saveEmployee).not.toHaveBeenCalled();
    expect(component['editingId']()).toBe(testEmployee2.id);
  });

  it('links a linked user account for someone allowed to open it', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[testid="employeeUserAccountLink-0"]')?.getAttribute('href')).toBe('/benutzer/detail/7');
    expect(element.querySelector('[testid="employeeNoUserAccount-1"]')).toBeTruthy();
  });

  it('states that an account exists without linking it for someone who cannot open it', () => {
    permissions = ['SETTINGS'];

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[testid="employeeUserAccountLink-0"]')).toBeNull();
    expect(element.querySelector('[testid="employeeUserAccountChip-0"]')?.textContent).toContain('Benutzerkonto vorhanden');
  });

  it('deleteEmployee() deletes the employee and reloads once the confirm dialog is accepted', () => {
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as any).mockReturnValueOnce({afterClosed: () => of(true)});

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteEmployee'](testEmployee2);

    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: {employeeName: `${testEmployee2.firstname} ${testEmployee2.lastname}`}
    }));
    expect(employeeApiMock.deleteEmployee).toHaveBeenCalledWith(testEmployee2.id);
    expect(toastrMock.success).toHaveBeenCalled();
    expect(employeeApiMock.findEmployees).toHaveBeenCalledTimes(2);
  });

  it('deleteEmployee() does nothing when the confirm dialog is cancelled', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteEmployee'](testEmployee2);

    expect(employeeApiMock.deleteEmployee).not.toHaveBeenCalled();
  });

  it('deleteEmployee() shows an error toast when a user account is still linked', () => {
    (employeeApiMock.deleteEmployee as any).mockReturnValue(throwError(() => new Error('failed')));
    const dialog = TestBed.inject(MatDialog);
    (dialog.open as any).mockReturnValueOnce({afterClosed: () => of(true)});

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteEmployee'](testEmployee1);

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('exportEmployee() downloads this employee\'s GDPR data takeout PDF', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=mitarbeiterdaten-00002.pdf'}),
      body: new Blob()
    });
    (employeeApiMock.exportEmployee as any).mockReturnValue(of(response));

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['exportEmployee'](testEmployee2);

    expect(employeeApiMock.exportEmployee).toHaveBeenCalledWith(testEmployee2.id);
    expect(fileHelperMock.downloadFile).toHaveBeenCalledWith('mitarbeiterdaten-00002.pdf', response.body);
  });

  it('exportEmployee() shows an error toast when the export fails', () => {
    (employeeApiMock.exportEmployee as any).mockReturnValue(throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['exportEmployee'](testEmployee2);

    expect(fileHelperMock.downloadFile).not.toHaveBeenCalled();
    expect(toastrMock.error).toHaveBeenCalledWith('Datenexport fehlgeschlagen!');
  });

  // testEmployee1 has a linked user account (whose own export already carries this employee's
  // personnel number/name), testEmployee2 does not - only the latter is meant to offer this button.
  it('only offers the export button for an employee with no linked user account', () => {
    const fixture = TestBed.createComponent(SettingsEmployeesComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[testid="exportEmployeeButton-0"]')).toBeNull();
    expect(element.querySelector('[testid="exportEmployeeButton-1"]')).not.toBeNull();
  });
});
