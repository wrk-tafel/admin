import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {ConfirmCustomerSaveDialog} from './confirm-customer-save-dialog.component';

describe('ConfirmUpdateCustomerDialog', () => {
    let dialogRef: MockedObject<MatDialogRef<ConfirmCustomerSaveDialog>>;

    beforeEach(() => {
        dialogRef = {
            close: vi.fn().mockName("MatDialogRef.close")
        } as any;

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: dialogRef
                },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        message: 'Customer has been updated by another user. Do you want to proceed?'
                    }
                }
            ]
        }).compileComponents();
    });

    it('component can be created', () => {
        const fixture = TestBed.createComponent(ConfirmCustomerSaveDialog);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('dialog opens with correct message', () => {
        const fixture = TestBed.createComponent(ConfirmCustomerSaveDialog);
        fixture.detectChanges();

        expect(fixture.componentInstance.data).toEqual({
            message: 'Customer has been updated by another user. Do you want to proceed?'
        });
    });

    it('closing dialog with true confirms update', () => {
        const fixture = TestBed.createComponent(ConfirmCustomerSaveDialog);
        fixture.componentInstance.dialogRef.close(true);
        fixture.detectChanges();

        expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('closing dialog with false cancels update', () => {
        const fixture = TestBed.createComponent(ConfirmCustomerSaveDialog);
        fixture.componentInstance.dialogRef.close(false);
        fixture.detectChanges();

        expect(dialogRef.close).toHaveBeenCalledWith(false);
    });
});
