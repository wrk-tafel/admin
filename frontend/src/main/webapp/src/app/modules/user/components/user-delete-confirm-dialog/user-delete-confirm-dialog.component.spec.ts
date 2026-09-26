import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {UserDeleteConfirmDialogComponent, UserDeleteConfirmDialogData} from './user-delete-confirm-dialog.component';

describe('UserDeleteConfirmDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<UserDeleteConfirmDialogComponent>>;

  function configure(data: UserDeleteConfirmDialogData) {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  }

  beforeEach(() => configure({username: 'mmustermann', name: 'Max Mustermann'}));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserDeleteConfirmDialogComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('names the user by username and full name and says the deletion is permanent', () => {
    const fixture = TestBed.createComponent(UserDeleteConfirmDialogComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[testid="deleteuser-name"]')?.textContent).toBe('mmustermann');
    expect(element.querySelector('[testid="deleteuser-fullname"]')?.textContent).toBe('(Max Mustermann)');
    expect(element.querySelector('[testid="deleteuser-message"]')?.textContent).toContain('endgültig gelöscht');
  });

  it('leaves the full name out when the user has none', () => {
    TestBed.resetTestingModule();
    configure({username: 'mmustermann', name: ''});

    const fixture = TestBed.createComponent(UserDeleteConfirmDialogComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="deleteuser-fullname"]')).toBeNull();
  });

  it('the delete button confirms', () => {
    const fixture = TestBed.createComponent(UserDeleteConfirmDialogComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[testid="okButton"]') as HTMLElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('the cancel button closes without a result', () => {
    const fixture = TestBed.createComponent(UserDeleteConfirmDialogComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[testid="cancelButton"]') as HTMLElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
