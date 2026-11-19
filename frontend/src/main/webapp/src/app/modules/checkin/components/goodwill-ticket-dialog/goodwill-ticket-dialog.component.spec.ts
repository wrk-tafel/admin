import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {GoodwillTicketDialogComponent} from './goodwill-ticket-dialog.component';

describe('GoodwillTicketDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<GoodwillTicketDialogComponent>>;

  beforeEach(() => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [{provide: MatDialogRef, useValue: dialogRef}]
    }).compileComponents();
  });

  it('starts with one person, no infants and no ticket number', () => {
    const component = TestBed.createComponent(GoodwillTicketDialogComponent).componentInstance;

    expect(component.ticketNumber()).toBeNull();
    expect(component.personCount()).toBe(1);
    expect(component.infantCount()).toBe(0);
    expect(component.valid()).toBe(false);
  });

  it('closes with the goodwill package once a ticket number is given', () => {
    const component = TestBed.createComponent(GoodwillTicketDialogComponent).componentInstance;
    component.ticketNumber.set(12);
    component.personCount.set(3);
    component.infantCount.set(1);

    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith({ticketNumber: 12, personCount: 3, infantCount: 1});
  });

  it('does not close with more infants than persons', () => {
    const component = TestBed.createComponent(GoodwillTicketDialogComponent).componentInstance;
    component.ticketNumber.set(12);
    component.personCount.set(1);
    component.infantCount.set(2);

    component.confirm();

    expect(component.tooManyInfants()).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does not close without persons', () => {
    const component = TestBed.createComponent(GoodwillTicketDialogComponent).componentInstance;
    component.ticketNumber.set(12);
    component.personCount.set(0);

    component.confirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does not accept a fractional ticket number', () => {
    const component = TestBed.createComponent(GoodwillTicketDialogComponent).componentInstance;
    component.ticketNumber.set(1.5);

    expect(component.valid()).toBe(false);
  });
});
