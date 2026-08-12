import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SendMailsDialogComponent, SendMailsDialogData} from './send-mails-dialog.component';
import {MailTypeEnum} from '../../../../../api/settings-api.service';

describe('SendMailsDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<SendMailsDialogComponent, boolean>>;

  const data: SendMailsDialogData = {
    distributionDate: '11.08.2026',
    mailTypes: [
      {mailType: MailTypeEnum.DAILY_REPORT, label: 'Tagesreport', recipients: ['to1@test.com', 'to2@test.com']},
      {mailType: MailTypeEnum.STATISTICS, label: 'Statistiken', recipients: []}
    ]
  };

  const createFixture = () => {
    const fixture = TestBed.createComponent(SendMailsDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('names the distribution the mails belong to', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="send-mails-distribution"]')?.textContent).toContain('11.08.2026');
  });

  it('lists the recipients per mail type', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="send-mails-recipients-DAILY_REPORT"]')?.textContent)
      .toContain('to1@test.com, to2@test.com');
  });

  it('says explicitly when a mail type would reach nobody', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('[testid="send-mails-recipients-STATISTICS"]')?.textContent)
      .toContain('Keine Empfänger');
  });

  it('confirming closes with true, cancelling with false', () => {
    const element: HTMLElement = createFixture().nativeElement;

    element.querySelector<HTMLButtonElement>('[testid="confirmButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    element.querySelector<HTMLButtonElement>('[testid="cancelButton"]')!.click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
