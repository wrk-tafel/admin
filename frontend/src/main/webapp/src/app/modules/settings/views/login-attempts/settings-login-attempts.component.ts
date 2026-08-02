import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {DatePipe} from '@angular/common';
import {LoginAttemptItem, LoginAttemptListResponse, SettingsApiService} from '../../../../api/settings-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {DeleteLoginAttemptDialogComponent} from './dialogs/delete-login-attempt-dialog.component';

@Component({
  selector: 'tafel-settings-login-attempts',
  templateUrl: 'settings-login-attempts.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    DatePipe,
    FaIconComponent,
    MatButton,
  ]
})
export class SettingsLoginAttemptsComponent {
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _loginAttempts = signal<LoginAttemptListResponse | null>(null);
  protected loginAttempts = this._loginAttempts;
  displayedColumns = ['username', 'failureCount', 'lastFailureAt', 'lockedUntil', 'actions'];

  constructor() {
    this.loadLoginAttempts();
  }

  protected isLocked(loginAttempt: LoginAttemptItem): boolean {
    return !!loginAttempt.lockedUntil && new Date(loginAttempt.lockedUntil).getTime() > Date.now();
  }

  private loadLoginAttempts() {
    this.settingsApiService.getLoginAttempts().subscribe({
      next: data => this._loginAttempts.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Login-Versuche', 'Fehler')
    });
  }

  protected deleteLoginAttempt(loginAttempt: LoginAttemptItem) {
    this.dialog.open(DeleteLoginAttemptDialogComponent)
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.settingsApiService.deleteLoginAttempt(loginAttempt.id).subscribe({
          next: () => {
            this.toastr.success('Login-Versuch gelöscht', 'Erfolgreich');
            this.loadLoginAttempts();
          },
          error: () => this.toastr.error('Löschen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected readonly faTrashCan = faTrashCan;
}
