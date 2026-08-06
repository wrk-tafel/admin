import {Component, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatSlideToggle, MatSlideToggleChange} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBell, faBellSlash} from '@fortawesome/free-solid-svg-icons';
import {PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
  selector: 'tafel-push-notification-settings',
  templateUrl: 'push-notification-settings.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle,
    FaIconComponent
  ]
})
export class PushNotificationSettingsComponent {
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly toastr = inject(TafelToastrService);

  readonly supported = this.pushNotificationService.isSupported();
  readonly enabled = signal(false);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
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
    } catch {
      event.source.checked = this.enabled();
      this.toastr.error('Push-Benachrichtigungen konnten nicht aktualisiert werden.');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly faBell = faBell;
  protected readonly faBellSlash = faBellSlash;
}
