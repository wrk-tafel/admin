import type {MockedObject} from 'vitest';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {DigitalIdCardDialogComponent, DigitalIdCardDialogData} from './digital-id-card-dialog.component';
import {CustomerApiService, IdCardFormat} from '../../../../../api/customer-api.service';
import {AppConfig, ConfigApiService} from '../../../../../api/config-api.service';
import {FileHelperService} from '../../../../../common/util/file-helper.service';
import {TafelToastrService} from '../../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('DigitalIdCardDialogComponent', () => {
  const baseConfig: AppConfig = {
    version: '1.0.0',
    buildDate: '2026-07-28',
    scannerFolderEnabled: false,
    idCardMailEnabled: true,
    environmentLabel: ''
  };

  let dialogRef: MockedObject<MatDialogRef<DigitalIdCardDialogComponent>>;
  let customerApiService: MockedObject<CustomerApiService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let toastr: MockedObject<TafelToastrService>;
  let config$: BehaviorSubject<AppConfig | null>;

  function fileResponse(filename: string): HttpResponse<Blob> {
    return new HttpResponse({
      body: new Blob([filename]),
      headers: new HttpHeaders({'content-disposition': `attachment; filename="${filename}"`})
    });
  }

  function createComponent(
    data: DigitalIdCardDialogData = {customerId: 101, email: 'eva@example.org'}
  ): ComponentFixture<DigitalIdCardDialogComponent> {
    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: CustomerApiService, useValue: customerApiService},
        {provide: ConfigApiService, useValue: {observeConfig: () => config$}},
        {provide: FileHelperService, useValue: fileHelperService},
        {provide: TafelToastrService, useValue: toastr}
      ]
    });
    const fixture = TestBed.createComponent(DigitalIdCardDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  function testIds(fixture: ComponentFixture<DigitalIdCardDialogComponent>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[testid]') as NodeListOf<HTMLElement>)
      .map(element => element.getAttribute('testid')!);
  }

  beforeEach(() => {
    dialogRef = {close: vi.fn().mockName('MatDialogRef.close')} as any;
    customerApiService = {
      getIdCard: vi.fn().mockName('CustomerApiService.getIdCard'),
      sendIdCardByMail: vi.fn().mockName('CustomerApiService.sendIdCardByMail')
    } as any;
    fileHelperService = {downloadFile: vi.fn().mockName('FileHelperService.downloadFile')} as any;
    toastr = {success: vi.fn().mockName('toastr.success'), error: vi.fn().mockName('toastr.error')} as any;
    config$ = new BehaviorSubject<AppConfig | null>(baseConfig);
  });

  it('offers every format and starts with the PDF selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.formatOptions.map(option => option.format)).toEqual(['PDF', 'IMAGE']);
    expect(component.selectedFormats()).toEqual(['PDF']);
    expect(testIds(fixture)).toEqual(expect.arrayContaining([
      'idcard-format-PDF', 'idcard-format-IMAGE', 'idcard-mail-recipient', 'sendIdCardButton'
    ]));
  });

  it('is a download only where mailing is not available', () => {
    config$.next({...baseConfig, idCardMailEnabled: false});
    const fixture = createComponent();

    const ids = testIds(fixture);
    expect(ids).not.toContain('sendIdCardButton');
    expect(ids).not.toContain('idcard-mail-recipient');
    expect(ids).toContain('downloadIdCardButton');
  });

  it('cannot send to a customer without an e-mail address, but still downloads', () => {
    const fixture = createComponent({customerId: 101, email: ' '});
    const component = fixture.componentInstance;

    expect(component.canSend()).toBe(false);
    expect(component.canDownload()).toBe(true);
    expect(testIds(fixture)).toContain('idcard-mail-missing');
  });

  it('needs at least one format for either action', () => {
    const component = createComponent().componentInstance;
    component.toggle('PDF', false);

    expect(component.canDownload()).toBe(false);
    expect(component.canSend()).toBe(false);
  });

  it('downloads every selected format, one request after the other', () => {
    customerApiService.getIdCard.mockImplementation((_id: number, format: IdCardFormat) =>
      of(fileResponse(`ausweis-101.${format.toLowerCase()}`)));
    const component = createComponent().componentInstance;
    component.toggle('IMAGE', true);

    component.download();

    expect(customerApiService.getIdCard.mock.calls.map(call => [call[0], call[1]])).toEqual([[101, 'PDF'], [101, 'IMAGE']]);
    expect(fileHelperService.downloadFile.mock.calls.map(call => call[0])).toEqual(['ausweis-101.pdf', 'ausweis-101.image']);
    expect(component.busy()).toBeNull();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('reports a failed download and unlocks the dialog again', () => {
    customerApiService.getIdCard.mockReturnValue(
      throwError(() => ({status: 404, error: {detail: 'Kunde Nr. 101 nicht vorhanden!'}})));
    const component = createComponent().componentInstance;

    component.download();

    expect(toastr.error).toHaveBeenCalledWith('Kunde Nr. 101 nicht vorhanden!', 'Ausweis konnte nicht erstellt werden!');
    expect(component.busy()).toBeNull();
  });

  it('sends the selected formats and closes', () => {
    customerApiService.sendIdCardByMail.mockReturnValue(of(undefined));
    const component = createComponent().componentInstance;
    component.toggle('IMAGE', true);

    component.send();

    expect(customerApiService.sendIdCardByMail).toHaveBeenCalledWith(101, ['PDF', 'IMAGE'], expect.anything());
    expect(toastr.success).toHaveBeenCalledWith('Ausweis wurde an eva@example.org gesendet!');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('reports a failed send and stays open', () => {
    customerApiService.sendIdCardByMail.mockReturnValue(
      throwError(() => ({status: 400, error: {detail: 'Für diesen Kunden ist keine E-Mail-Adresse hinterlegt!'}})));
    const component = createComponent().componentInstance;

    component.send();

    expect(toastr.error).toHaveBeenCalledWith('Für diesen Kunden ist keine E-Mail-Adresse hinterlegt!', 'Senden fehlgeschlagen!');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.busy()).toBeNull();
  });
});
