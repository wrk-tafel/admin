import {Component, computed, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle, MatSlideToggleChange} from '@angular/material/slide-toggle';
import {MatIcon} from '@angular/material/icon';
import {DatePipe} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {PushDeviceItem, PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {userAgentDeviceType, userAgentLabel} from '../../../../common/util/user-agent-label.util';
import {relativeTimeLabel} from '../../../../common/util/relative-time.util';
import {
  PushNotificationType,
  PushPreferencesResponse,
  PushTestResult,
  pushNotificationTypeDescription,
  pushNotificationTypeGroups,
  pushNotificationTypeLabel
} from '../../../../api/push-api.service';
import {RenameDeviceDialogComponent} from './dialogs/rename-device-dialog.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import notificationsIcon from '@material-symbols/svg-400/outlined/notifications.svg';
import notificationsOffIcon from '@material-symbols/svg-400/outlined/notifications_off.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit.svg';
import sendIcon from '@material-symbols/svg-400/outlined/send.svg';
import progressActivityIcon from '@material-symbols/svg-400/outlined/progress_activity.svg';
import checkCircleIcon from '@material-symbols/svg-400/outlined/check_circle.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning.svg';
import mobile2Icon from '@material-symbols/svg-400/outlined/mobile_2.svg';
import desktopWindowsIcon from '@material-symbols/svg-400/outlined/desktop_windows.svg';
import questionMarkIcon from '@material-symbols/svg-400/outlined/question_mark.svg';

const DEFAULT_PREFERENCES: PushPreferencesResponse = {masterEnabled: true, types: []};

/**
 * What became of the last test notification sent to one device, shown next to that device rather
 * than only as a toast: "the test never arrived" is the moment this button exists for, and a toast
 * is gone by the time the user has looked at their notification centre.
 */
export interface PushDeviceTestStatus {
  state: 'pending' | 'success' | 'error';
  text: string;
}

const PERMISSION_BLOCKED_HINT = 'Benachrichtigungen sind in diesem Browser blockiert - bitte in den '
  + 'Seiteneinstellungen des Browsers erlauben.';

@Component({
  selector: 'tafel-push-notification-settings',
  templateUrl: 'push-notification-settings.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle,
    MatIcon,
    DatePipe,
    MatButton,
    MatTooltipModule
  ]
})
export class PushNotificationSettingsComponent {
  private readonly registerIcons = registerSvgIcons({
    notifications: notificationsIcon,
    notifications_off: notificationsOffIcon,
    delete: deleteIcon,
    edit: editIcon,
    send: sendIcon,
    progress_activity: progressActivityIcon,
    check_circle: checkCircleIcon,
    warning: warningIcon,
    mobile_2: mobile2Icon,
    desktop_windows: desktopWindowsIcon,
    question_mark: questionMarkIcon
  });

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
  // Outcome of the last test per device, keyed by device id for the same reason.
  readonly testStatuses = signal<Record<number, PushDeviceTestStatus>>({});
  readonly notificationPermission = signal<NotificationPermission | null>(null);

  /**
   * `denied` is the only state worth acting on here: `default` still shows the browser's prompt when
   * the toggle is switched on, and `granted` needs no explanation at all.
   */
  readonly permissionBlocked = computed(() => this.notificationPermission() === 'denied');

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
    this.readPermissionState();

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
      // The browser's prompt is what the failed enable ran into, so its outcome is only known now -
      // a user who just pressed "Blockieren" gets the explanation rather than a generic failure.
      this.readPermissionState();
      event.source.checked = this.enabled();
      this.toastr.error(
        this.permissionBlocked()
          ? PERMISSION_BLOCKED_HINT
          : 'Push-Benachrichtigungen konnten nicht aktualisiert werden.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private readPermissionState() {
    this.notificationPermission.set(this.pushNotificationService.permissionState());
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
    this.setTestStatus(device.id, {state: 'pending', text: 'Test wird gesendet …'});

    try {
      const result = await this.pushNotificationService.sendTestNotification(device.id);

      switch (result) {
        case PushTestResult.SENT:
          this.setTestStatus(device.id, {state: 'success', text: 'Test gesendet - sollte gleich am Gerät erscheinen'});
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
          this.clearTestStatus(device.id);
          await this.loadDevices();
          break;
        case PushTestResult.NOT_CONFIGURED:
          this.setTestStatus(device.id, {state: 'error', text: 'Am Server nicht eingerichtet'});
          this.toastr.error(
            'Push-Benachrichtigungen sind am Server nicht konfiguriert, es kann derzeit keine Benachrichtigung zugestellt werden.'
          );
          break;
        default:
          this.setTestStatus(device.id, {state: 'error', text: 'Nicht zugestellt'});
          this.toastr.error('Test-Benachrichtigung konnte nicht zugestellt werden.');
          break;
      }
    } catch {
      this.setTestStatus(device.id, {state: 'error', text: 'Senden fehlgeschlagen'});
      this.toastr.error('Test-Benachrichtigung konnte nicht gesendet werden.');
    } finally {
      this.testedDeviceId.set(null);
    }
  }

  protected testStatus(device: PushDeviceItem): PushDeviceTestStatus | undefined {
    return this.testStatuses()[device.id];
  }

  private setTestStatus(deviceId: number, status: PushDeviceTestStatus) {
    this.testStatuses.update(statuses => ({...statuses, [deviceId]: status}));
  }

  private clearTestStatus(deviceId: number) {
    this.testStatuses.update(statuses => {
      const rest = {...statuses};
      delete rest[deviceId];
      return rest;
    });
  }

  async removeDevice(device: PushDeviceItem) {
    try {
      await this.pushNotificationService.removeDevice(device);
      if (device.isCurrentDevice) {
        this.enabled.set(false);
      }
      this.clearTestStatus(device.id);
      await this.loadDevices();
      this.toastr.success('Gerät wurde entfernt.');
    } catch {
      this.toastr.error('Gerät konnte nicht entfernt werden.');
    }
  }

  protected deviceLabel(device: PushDeviceItem): string {
    return device.label ?? userAgentLabel(device.userAgent);
  }

  /**
   * A custom label replaces the browser/OS text, so the icon is what still says what kind of device
   * an entry is once someone has named it "Tafel Ausgabe 1".
   */
  protected deviceIcon(device: PushDeviceItem): string {
    switch (userAgentDeviceType(device.userAgent)) {
      case 'mobile':
        return 'mobile_2';
      case 'desktop':
        return 'desktop_windows';
      default:
        return 'question_mark';
    }
  }

  protected deviceTypeLabel(device: PushDeviceItem): string {
    switch (userAgentDeviceType(device.userAgent)) {
      case 'mobile':
        return 'Mobiles Gerät';
      case 'desktop':
        return 'Computer';
      default:
        return 'Unbekannter Gerätetyp';
    }
  }

  /**
   * "Registriert vor 3 Wochen" answers the question this list is actually scanned for; the exact
   * timestamp stays available as the row's tooltip.
   */
  protected registeredAgo(device: PushDeviceItem): string | null {
    return relativeTimeLabel(device.createdAt);
  }

  /**
   * The preferences response carries only which types this user may receive, in enum order. This
   * turns that flat list into the screen's grouping and ordering, keeping only the types that came
   * back and dropping any group left empty by the permission filtering - so a user who is an
   * audience for nothing technical sees no "Technisches" heading at all, rather than an empty one.
   */
  readonly typeGroups = computed(() => {
    const receivable = new Map(this.preferences().types.map(item => [item.type, item]));

    return pushNotificationTypeGroups
      .map(group => ({
        title: group.title,
        items: group.types.map(type => receivable.get(type)).filter(item => item !== undefined)
      }))
      .filter(group => group.items.length > 0);
  });

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

  protected readonly permissionBlockedHint = PERMISSION_BLOCKED_HINT;

}
