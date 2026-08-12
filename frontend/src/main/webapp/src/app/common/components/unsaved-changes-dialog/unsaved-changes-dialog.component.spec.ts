import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {UnsavedChangesDialogComponent} from './unsaved-changes-dialog.component';

describe('UnsavedChangesDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<UnsavedChangesDialogComponent, boolean>>;

  const createFixture = () => {
    const fixture = TestBed.createComponent(UnsavedChangesDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('says what leaving the page would cost', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="unsaved-changes-text"]')?.textContent).toContain('nicht gespeichert');
  });

  it('discarding closes with true, staying with false', () => {
    const element: HTMLElement = createFixture().nativeElement;

    element.querySelector<HTMLButtonElement>('[testid="confirmButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    element.querySelector<HTMLButtonElement>('[testid="cancelButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
