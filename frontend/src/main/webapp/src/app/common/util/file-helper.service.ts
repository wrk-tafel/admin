import {Service} from '@angular/core';

// `a.click()` only *starts* the download - for a larger file (a ZIP export) the browser is still
// reading the blob URL well after this call returns, and Firefox/Safari can abort a download whose
// object URL is revoked while that read is still in flight. A revoke right after `click()` raced
// that read; deferring it lets the download actually begin first. Arbitrary but generous - once
// the browser has the bytes, holding the URL a little longer costs nothing.
const REVOKE_DELAY_MILLIS = 4000;

@Service()
export class FileHelperService {

  downloadFile(filename: string, data: Blob) {
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(data);
    a.href = objectUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_DELAY_MILLIS);
  }

}
