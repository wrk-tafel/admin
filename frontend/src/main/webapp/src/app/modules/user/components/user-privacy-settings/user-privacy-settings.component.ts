import {Component, inject} from '@angular/core';
import {HttpResponse} from '@angular/common/http';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {UserApiService} from '../../../../api/user-api.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../common/util/content-disposition.util';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';

/**
 * The "Datenschutz" tab of "Mein Konto": what the application holds about the user's own account, and what it does
 * with it. Both are downloads that stay on the page.
 */
@Component({
  selector: 'tafel-user-privacy-settings',
  templateUrl: 'user-privacy-settings.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatIcon
  ]
})
export class UserPrivacySettingsComponent {
  private readonly registerIcons = registerSvgIcons({
    download: downloadIcon
  });

  private readonly userApiService = inject(UserApiService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly toastr = inject(TafelToastrService);

  /**
   * The GDPR Art. 15/20 data takeout for the caller's own account (issue #3363), as a downloadable
   * ZIP (PDF plus a machine-readable JSON file).
   */
  exportUserData() {
    this.userApiService.exportUser().subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.toastr.error('Datenexport fehlgeschlagen!')
    });
  }

  /** The Art. 13 GDPR privacy notice for staff (issue #3429), as a downloadable PDF. */
  downloadStaffPrivacyNotice() {
    this.userApiService.generatePrivacyNoticeTemplate().subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.toastr.error('Herunterladen fehlgeschlagen!')
    });
  }

  private processFileResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
  }
}
