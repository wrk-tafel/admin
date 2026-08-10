import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {SupportDialogComponent} from './support-dialog.component';

describe('SupportDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<SupportDialogComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {provide: MatDialogRef, useValue: {close: vi.fn().mockName('MatDialogRef.close')}}
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as MockedObject<MatDialogRef<SupportDialogComponent>>;
  });

  it('closes with the typed request', () => {
    const fixture = TestBed.createComponent(SupportDialogComponent);
    const component = fixture.componentInstance;

    component.supportTitle.set('Login geht nicht');
    component.supportText.set('Seite bleibt leer');
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      title: 'Login geht nicht',
      text: 'Seite bleibt leer'
    });
  });

  it('says what is attached', () => {
    const fixture = TestBed.createComponent(SupportDialogComponent);
    fixture.detectChanges();

    const hint: HTMLElement = fixture.nativeElement.querySelector('[testid="supportHint"]');
    expect(hint.textContent).toContain('Benutzername');
    expect(hint.textContent).toContain('Screenshot');
  });

});
