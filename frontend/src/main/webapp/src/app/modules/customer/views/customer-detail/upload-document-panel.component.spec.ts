import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, of} from 'rxjs';
import {UploadDocumentPanelComponent} from './upload-document-panel.component';
import {AppConfig, ConfigApiService} from '../../../../api/config-api.service';
import {DocumentScannerApiService} from '../../../../api/document-scanner-api.service';

describe('UploadDocumentPanelComponent', () => {
  let configApiService: MockedObject<ConfigApiService>;
  let config: BehaviorSubject<AppConfig | null>;

  beforeEach(() => {
    config = new BehaviorSubject<AppConfig | null>({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: true});
    const configApiServiceSpy = {
      observeConfig: vi.fn().mockName('ConfigApiService.observeConfig').mockReturnValue(config.asObservable())
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
    configApiService.observeConfig.mockReturnValue(of({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: false}));

    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceToggle"]')).toBeNull();
    // The file upload itself is never optional, so the panel stays usable.
    expect(fixture.nativeElement.querySelector('[testid="documentDropzone"]')).not.toBeNull();
  });

  it('hides the scanner source when the config request failed', () => {
    configApiService.observeConfig.mockReturnValue(of(null));

    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceToggle"]')).toBeNull();
  });

  /**
   * The deployment's config file can be edited while this panel is open, so the source toggle has
   * to follow the backend rather than the answer it got when it was created.
   */
  it('drops the scanner source when the backend switches it off while the panel is open', () => {
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectSource('scanner');
    fixture.componentInstance.selectedScannerFileName.set('scan-1.pdf');

    config.next({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: false});
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(false);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceToggle"]')).toBeNull();
    // ... and the user isn't left standing on a source they can no longer leave
    expect(fixture.componentInstance.source()).toBe('upload');
    expect(fixture.componentInstance.selectedScannerFileName()).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid="documentDropzone"]')).not.toBeNull();
  });

  it('offers the scanner source again when the backend switches it back on', () => {
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    config.next({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: false});
    fixture.detectChanges();
    config.next({version: '1.0.0', buildTime: 'unknown', scannerFolderEnabled: true});
    fixture.detectChanges();

    expect(fixture.componentInstance.scannerEnabled()).toBe(true);
    expect(fixture.nativeElement.querySelector('[testid="documentSourceScanner"]')).not.toBeNull();
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

  // An import removes the file it took from the scanner folder. Waiting for the announcement of
  // that on the SSE stream would leave the file on screen whenever the stream is not connected yet.
  it('re-reads the scanner file list once an import it handed over went through', () => {
    const documentScannerApiService = TestBed.inject(DocumentScannerApiService) as MockedObject<DocumentScannerApiService>;
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectSource('scanner');
    documentScannerApiService.getScannerFiles.mockClear();

    fixture.componentInstance.reset();

    expect(documentScannerApiService.getScannerFiles).toHaveBeenCalled();
  });

  it('does not read the scanner file list after an upload from the file picker', () => {
    const documentScannerApiService = TestBed.inject(DocumentScannerApiService) as MockedObject<DocumentScannerApiService>;
    const fixture = TestBed.createComponent(UploadDocumentPanelComponent);
    fixture.detectChanges();

    fixture.componentInstance.reset();

    expect(documentScannerApiService.getScannerFiles).not.toHaveBeenCalled();
  });
});
