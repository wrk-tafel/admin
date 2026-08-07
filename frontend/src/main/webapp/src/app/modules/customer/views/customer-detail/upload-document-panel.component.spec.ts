import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {UploadDocumentPanelComponent} from './upload-document-panel.component';
import {ConfigApiService} from '../../../../api/config-api.service';
import {DocumentScannerApiService} from '../../../../api/document-scanner-api.service';

describe('UploadDocumentPanelComponent', () => {
  let configApiService: MockedObject<ConfigApiService>;

  beforeEach(() => {
    const configApiServiceSpy = {
      getConfig: vi.fn().mockName('ConfigApiService.getConfig')
        .mockReturnValue(of({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: true}))
    };
    const documentScannerApiServiceSpy = {
      getScannerFiles: vi.fn().mockName('DocumentScannerApiService.getScannerFiles').mockReturnValue(of({items: []})),
      listenForScannerFileChanges: vi.fn().mockName('DocumentScannerApiService.listenForScannerFileChanges')
        .mockReturnValue(of({items: []})),
      getScannerFileContentUrl: vi.fn().mockName('DocumentScannerApiService.getScannerFileContentUrl').mockReturnValue('')
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: ConfigApiService, useValue: configApiServiceSpy},
        {provide: DocumentScannerApiService, useValue: documentScannerApiServiceSpy}
      ]
    }).compileComponents();

    configApiService = TestBed.inject(ConfigApiService) as MockedObject<ConfigApiService>;
  });

  it('offers the scanner source when the deployment has a scanner folder', () => {
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(true);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceScanner"]')).not.toBeNull();
  });

  it('hides the scanner source when the deployment has no scanner folder', () => {
    configApiService.getConfig.mockReturnValue(of({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: false}));

    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceToggle"]')).toBeNull();
    // The file upload itself is never optional, so the panel stays usable.
    expect(fixture.nativeElement.querySelector('[testid="documentDropzone"]')).not.toBeNull();
  });

  it('hides the scanner source when the config request failed', () => {
    configApiService.getConfig.mockReturnValue(of(null));

    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceToggle"]')).toBeNull();
  });

  it('loads the scanner file list only once the scanner source is selected', () => {
    const documentScannerApiService = TestBed.inject(DocumentScannerApiService) as MockedObject<DocumentScannerApiService>;
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(documentScannerApiService.getScannerFiles).not.toHaveBeenCalled();

    fixture.componentInstance.selectSource('scanner');

    expect(documentScannerApiService.getScannerFiles).toHaveBeenCalled();
    expect(documentScannerApiService.listenForScannerFileChanges).toHaveBeenCalled();
  });
});
