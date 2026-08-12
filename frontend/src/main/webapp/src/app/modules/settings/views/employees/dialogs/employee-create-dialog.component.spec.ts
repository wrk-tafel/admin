import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {EmployeeCreateDialogComponent} from './employee-create-dialog.component';
import {EmployeeApiService, EmployeeData, PersonnelNumberAvailabilityResponse} from '../../../../../api/employee-api.service';

describe('EmployeeCreateDialogComponent', () => {
  const existingEmployee: EmployeeData = {id: 2, personnelNumber: '00002', firstname: 'First 2', lastname: 'Last 2'};

  let dialogRef: MockedObject<MatDialogRef<EmployeeCreateDialogComponent>>;
  let employeeApiMock: Partial<EmployeeApiService>;

  beforeEach(async () => {
    vi.useFakeTimers();

    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    employeeApiMock = {
      checkPersonnelNumberAvailability: vi.fn(() => of<PersonnelNumberAvailabilityResponse>({available: true}))
    };

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: EmployeeApiService, useValue: employeeApiMock}
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with blank defaults', () => {
    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      personnelNumber: '',
      firstname: '',
      lastname: ''
    });
  });

  it('save() closes dialog with form value when valid', () => {
    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({personnelNumber: '00001', firstname: 'First', lastname: 'Last'});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({type: 'create', employee: component.form.value});
  });

  it('save() does not close dialog when invalid', () => {
    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('reports a personnel number already given out while it is typed and refuses to save it', () => {
    (employeeApiMock.checkPersonnelNumberAvailability as any).mockReturnValue(
      of<PersonnelNumberAvailabilityResponse>({available: false, existingEmployee})
    );

    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({personnelNumber: '00002', firstname: 'First', lastname: 'Last'});
    vi.advanceTimersByTime(500);
    fixture.detectChanges();

    expect(employeeApiMock.checkPersonnelNumberAvailability).toHaveBeenCalledWith('00002');
    expect(component.personnelNumber.errors).toEqual({duplicateEmployee: true});

    component.save();
    expect(dialogRef.close).not.toHaveBeenCalled();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[testid="employeeCreateDuplicateHint"]')?.textContent).toContain('First 2 Last 2');
  });

  it('closes with the colliding employee to open instead of creating one', () => {
    (employeeApiMock.checkPersonnelNumberAvailability as any).mockReturnValue(
      of<PersonnelNumberAvailabilityResponse>({available: false, existingEmployee})
    );

    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({personnelNumber: '00002'});
    vi.advanceTimersByTime(500);

    component['openDuplicate'](existingEmployee);

    expect(dialogRef.close).toHaveBeenCalledWith({type: 'openExisting', employee: existingEmployee});
  });

  it('does not block a save when the check itself cannot be answered', () => {
    (employeeApiMock.checkPersonnelNumberAvailability as any).mockReturnValue(throwError(() => new Error('down')));

    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({personnelNumber: '00002', firstname: 'First', lastname: 'Last'});
    vi.advanceTimersByTime(500);

    component.save();

    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(EmployeeCreateDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
