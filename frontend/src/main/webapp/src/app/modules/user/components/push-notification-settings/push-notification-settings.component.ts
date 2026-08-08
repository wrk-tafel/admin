import {Component, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle, MatSlideToggleChange} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBell, faBellSlash, faPaperPlane, faPen, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {DatePipe} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {PushDeviceItem, PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {userAgentLabel} from '../../../../common/util/user-agent-label.util';
import {
  PushNotificationType,
  PushPreferencesResponse,
  PushTestResult,
  pushNotificationTypeDescription,
  pushNotificationTypeLabel
} from '../../../../api/push-api.service';
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
    MatButton,
    MatTooltipModule
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
  // Id of the device whose test notification is currently in flight - per-device rather than a
  // single flag so testing one device doesn't disable the button on all the others.
  readonly testedDeviceId = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.initialize();
    });
  }

  /**
   * The subscription sync has to finish *before* the device list is fetched, not alongside it: it
   * may re-register this device with the backend (see `PushNotificationService.syncSubscription`),
   * and a list fetched in parallel reads the table before that registration lands - which showed
   * up as an enabled toggle above an empty device list.
   */
  private async initialize() {
    this.loadPreferences();

    if (this.supported) {
      this.enabled.set(await this.pushNotificationService.syncSubscription());
    }
    this.loading.set(false);

    await this.loadDevices();
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

  /**
   * Each outcome gets its own message on purpose: "nothing arrived" is exactly the situation this
   * button exists for, so the difference between "the server has no VAPID keypair configured",
   * "this device's subscription is gone" and "the push service rejected the send" has to be
   * visible here rather than collapsed into one generic error.
   */
  async sendTestNotification(device: PushDeviceItem) {
    this.testedDeviceId.set(device.id);

    try {
      const result = await this.pushNotificationService.sendTestNotification(device.id);

      switch (result) {
        case PushTestResult.SENT:
          this.toastr.success('Test-Benachrichtigung wurde gesendet und sollte gleich am Gerät erscheinen.');
          break;
        case PushTestResult.EXPIRED:
          // The backend removes such a subscription as part of the send attempt, so the list has
          // to be reloaded to stay in sync with it.
          this.toastr.error(
            'Das Gerät ist beim Push-Dienst nicht mehr angemeldet und wurde entfernt. '
            + 'Bitte die Benachrichtigungen auf diesem Gerät neu aktivieren.'
          );
          if (device.isCurrentDevice) {
            this.enabled.set(false);
          }
          await this.loadDevices();
          break;
        case PushTestResult.NOT_CONFIGURED:
          this.toastr.error(
            'Push-Benachrichtigungen sind am Server nicht konfiguriert, es kann derzeit keine Benachrichtigung zugestellt werden.'
          );
          break;
        default:
          this.toastr.error('Test-Benachrichtigung konnte nicht zugestellt werden.');
          break;
      }
    } catch {
      this.toastr.error('Test-Benachrichtigung konnte nicht gesendet werden.');
    } finally {
      this.testedDeviceId.set(null);
    }
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

  protected typeDescription(type: PushNotificationType): string {
    return pushNotificationTypeDescription[type];
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
  protected readonly faPaperPlane = faPaperPlane;
}
