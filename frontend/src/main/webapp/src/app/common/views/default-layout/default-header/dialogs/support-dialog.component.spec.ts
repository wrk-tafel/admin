import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {SupportDialogComponent, SupportDialogData} from './support-dialog.component';

describe('SupportDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<SupportDialogComponent>>;

  const configureWith = async (data: SupportDialogData | null) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {provide: MatDialogRef, useValue: {close: vi.fn().mockName('MatDialogRef.close')}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    dialogRef = TestBed.inject(MatDialogRef) as MockedObject<MatDialogRef<SupportDialogComponent>>;
  };

  it('closes with the typed request', async () => {
    await configureWith({screenshot: 'data:image/jpeg;base64,AAAA'});
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

  it('shows the screenshot that goes along, so it is not a surprise', async () => {
    await configureWith({screenshot: 'data:image/jpeg;base64,AAAA'});
    const fixture = TestBed.createComponent(SupportDialogComponent);
    fixture.detectChanges();

    const preview: HTMLImageElement = fixture.nativeElement.querySelector('[testid="screenshotPreview"]');
    expect(preview.src).toBe('data:image/jpeg;base64,AAAA');
    expect(preview.alt).not.toBe('');
    expect(fixture.nativeElement.querySelector('[testid="screenshotHint"]').textContent)
      .toContain('mitgeschickt');
  });

  it('says what else is attached', async () => {
    await configureWith({screenshot: null});
    const fixture = TestBed.createComponent(SupportDialogComponent);
    fixture.detectChanges();

    const hint: HTMLElement = fixture.nativeElement.querySelector('[testid="supportHint"]');
    expect(hint.textContent).toContain('Benutzername');
    expect(hint.textContent).toContain('Screenshot');
  });

  it('shows no preview when no screenshot could be taken', async () => {
    await configureWith({screenshot: null});
    const fixture = TestBed.createComponent(SupportDialogComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="screenshotPreview"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid="screenshotHint"]')).toBeNull();
  });

});
