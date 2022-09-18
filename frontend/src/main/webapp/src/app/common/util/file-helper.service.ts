import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileHelperService {

  downloadFile(filename: string, data: Blob) {
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(data);
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

}
