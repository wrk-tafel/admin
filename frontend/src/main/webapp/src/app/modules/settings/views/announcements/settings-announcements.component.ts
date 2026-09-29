import {Component, inject, signal, viewChild} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import dayjs from 'dayjs';
import {AnnouncementResponse, NotificationApiService} from '../../../../api/notification-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';
/** What an expiry date without a time means: the announcement stays through the end of that day. */
const END_OF_DAY = '23:59:59';

/**
 * Messages for every user: what an administrator writes here shows up in everybody's bell (header)
 * until it expires or is deleted. Administrators only (`settings.routes.ts`).
 */
@Component({
  selector: 'tafel-settings-announcements',
  templateUrl: 'settings-announcements.component.html',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatIcon
  ]
})
export class SettingsAnnouncementsComponent {
  private readonly registerIcons = registerSvgIcons({
    delete: deleteIcon,
    edit: editIcon
  });

  private readonly notificationApiService = inject(NotificationApiService);
  private readonly toastr = inject(TafelToastrService);

  protected readonly announcements = signal<AnnouncementResponse[]>([]);
  protected readonly loaded = signal(false);
  protected readonly editingId = signal<number | null>(null);

  private readonly formDirective = viewChild(FormGroupDirective);

  protected readonly form = new FormGroup({
    title: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.maxLength(200)]}),
    message: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)]}),
    expiresDate: new FormControl('', {nonNullable: true}),
    expiresTime: new FormControl('', {nonNullable: true})
  });

  constructor() {
    this.load();
  }

  private load() {
    this.notificationApiService.getAnnouncements().subscribe({
      next: response => {
        this.announcements.set(response.items);
        this.loaded.set(true);
      },
      error: () => this.loaded.set(true)
    });
  }

  protected save() {
    // trimmed before validating, so a whitespace-only text does not pass `required`
    this.form.controls.title.setValue(this.form.controls.title.value.trim());
    this.form.controls.message.setValue(this.form.controls.message.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      title: value.title,
      message: value.message,
      // the time is optional - a date alone runs to the end of that day
      expiresAt: value.expiresDate ? `${value.expiresDate}T${value.expiresTime ? value.expiresTime + ':00' : END_OF_DAY}` : null
    };
    const id = this.editingId();
    const call = id === null
      ? this.notificationApiService.createAnnouncement(request)
      : this.notificationApiService.updateAnnouncement(id, request);

    call.subscribe({
      next: () => {
        this.toastr.success(id === null ? 'Ankündigung veröffentlicht' : 'Ankündigung gespeichert', 'Erfolgreich');
        this.resetForm();
        this.load();
      },
      error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen')
    });
  }

  protected edit(announcement: AnnouncementResponse) {
    this.editingId.set(announcement.id);
    this.form.setValue({
      title: announcement.title,
      message: announcement.message,
      expiresDate: announcement.expiresAt ? dayjs(announcement.expiresAt).format(DATE_FORMAT) : '',
      expiresTime: announcement.expiresAt ? dayjs(announcement.expiresAt).format(TIME_FORMAT) : ''
    });
  }

  protected resetForm() {
    this.editingId.set(null);
    // through the directive: a plain `form.reset()` leaves the form 'submitted', so the fields would
    // show their required errors right after a successful save
    const empty = {title: '', message: '', expiresDate: '', expiresTime: ''};
    const directive = this.formDirective();
    if (directive) {
      directive.resetForm(empty);
    } else {
      this.form.reset(empty);
    }
  }

  protected remove(announcement: AnnouncementResponse) {
    this.notificationApiService.deleteAnnouncement(announcement.id).subscribe({
      next: () => {
        this.toastr.success('Ankündigung gelöscht', 'Erfolgreich');
        if (this.editingId() === announcement.id) {
          this.resetForm();
        }
        this.load();
      },
      error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen')
    });
  }
}
