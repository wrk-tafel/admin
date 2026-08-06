import {Component, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle, MatSlideToggleChange} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBell, faBellSlash, faPen, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {DatePipe} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {PushDeviceItem, PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {userAgentLabel} from '../../../../common/util/user-agent-label.util';
import {PushNotificationType, PushPreferencesResponse, pushNotificationTypeLabel} from '../../../../api/push-api.service';
import {RenameDeviceDialogComponent} from './dialogs/rename-device-dialog.component';

const DEFAULT_PREFERENCES: PushPreferencesResponse = {masterEnabled: true, types: []};

@Component({
  selector: 'tafel-push-notification-settings',
  templateUrl: 'push-notification-settings.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle,
    FaIconComponent,
    DatePipe,
    MatButton
  ]
})
export class PushNotificationSettingsComponent {
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  readonly supported = this.pushNotificationService.isSupported();
  readonly enabled = signal(false);
  readonly loading = signal(true);
  readonly devices = signal<PushDeviceItem[]>([]);
  readonly preferences = signal<PushPreferencesResponse>(DEFAULT_PREFERENCES);
  readonly preferencesLoading = signal(true);

  constructor() {
    effect(() => {
      this.loadDevices();
      this.loadPreferences();

      if (!this.supported) {
        this.loading.set(false);
        return;
      }

      this.pushNotificationService.isEnabled().then(value => {
        this.enabled.set(value);
        this.loading.set(false);
      });
    });
  }

  async onToggle(event: MatSlideToggleChange) {
    this.loading.set(true);

    try {
      if (event.checked) {
        await this.pushNotificationService.enable();
        this.enabled.set(true);
        this.toastr.success('Push-Benachrichtigungen wurden aktiviert.');
      } else {
        await this.pushNotificationService.disable();
        this.enabled.set(false);
        this.toastr.success('Push-Benachrichtigungen wurden deaktiviert.');
      }
      await this.loadDevices();
    } catch {
      event.source.checked = this.enabled();
      this.toastr.error('Push-Benachrichtigungen konnten nicht aktualisiert werden.');
    } finally {
      this.loading.set(false);
    }
  }

  renameDevice(device: PushDeviceItem) {
    this.dialog.open(RenameDeviceDialogComponent, {
      data: {currentLabel: device.label}
    }).afterClosed().subscribe(async (result: string | null | undefined) => {
      if (result === undefined) {
        return;
      }

      try {
        await this.pushNotificationService.renameDevice(device.id, result);
        await this.loadDevices();
        this.toastr.success('Gerät wurde umbenannt.');
      } catch {
        this.toastr.error('Gerät konnte nicht umbenannt werden.');
      }
    });
  }

  async removeDevice(device: PushDeviceItem) {
    try {
      await this.pushNotificationService.removeDevice(device);
      if (device.isCurrentDevice) {
        this.enabled.set(false);
      }
      await this.loadDevices();
      this.toastr.success('Gerät wurde entfernt.');
    } catch {
      this.toastr.error('Gerät konnte nicht entfernt werden.');
    }
  }

  protected deviceLabel(device: PushDeviceItem): string {
    return device.label ?? userAgentLabel(device.userAgent);
  }

  protected typeLabel(type: PushNotificationType): string {
    return pushNotificationTypeLabel[type];
  }

  async onMasterToggle(event: MatSlideToggleChange) {
    this.preferencesLoading.set(true);

    try {
      const updated = await this.pushNotificationService.setMasterEnabled(event.checked);
      this.preferences.set(updated);
      this.toastr.success(
        event.checked
          ? 'Benachrichtigungen wurden für alle Geräte aktiviert.'
          : 'Benachrichtigungen wurden für alle Geräte deaktiviert.'
      );
    } catch {
      event.source.checked = this.preferences().masterEnabled;
      this.toastr.error('Einstellung konnte nicht gespeichert werden.');
    } finally {
      this.preferencesLoading.set(false);
    }
  }

  async onTypeToggle(type: PushNotificationType, event: MatSlideToggleChange) {
    this.preferencesLoading.set(true);

    try {
      const updated = await this.pushNotificationService.setTypeEnabled(type, event.checked);
      this.preferences.set(updated);
      this.toastr.success('Einstellung wurde gespeichert.');
    } catch {
      event.source.checked = this.preferences().types.find(item => item.type === type)?.enabled ?? true;
      this.toastr.error('Einstellung konnte nicht gespeichert werden.');
    } finally {
      this.preferencesLoading.set(false);
    }
  }

  private async loadDevices() {
    this.devices.set(await this.pushNotificationService.getDevices());
  }

  private async loadPreferences() {
    this.preferences.set(await this.pushNotificationService.getPreferences());
    this.preferencesLoading.set(false);
  }

  protected readonly faBell = faBell;
  protected readonly faBellSlash = faBellSlash;
  protected readonly faTrashCan = faTrashCan;
  protected readonly faPen = faPen;
}
