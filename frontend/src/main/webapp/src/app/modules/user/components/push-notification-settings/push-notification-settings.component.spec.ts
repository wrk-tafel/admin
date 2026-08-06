import type {MockedObject} from 'vitest';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {PushNotificationSettingsComponent} from './push-notification-settings.component';
import {PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('PushNotificationSettingsComponent', () => {
  let pushNotificationService: MockedObject<PushNotificationService>;
  let toastr: MockedObject<TafelToastrService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PushNotificationService,
          useValue: {
            isSupported: vi.fn().mockReturnValue(true),
            isEnabled: vi.fn().mockResolvedValue(false),
            enable: vi.fn().mockResolvedValue(undefined),
            disable: vi.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn(),
            success: vi.fn()
          }
        }
      ]
    }).compileComponents();

    pushNotificationService = TestBed.inject(PushNotificationService) as MockedObject<PushNotificationService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the unsupported hint when push is not supported', () => {
    pushNotificationService.isSupported.mockReturnValue(false);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor

    expect(fixture.componentInstance.supported).toBe(false);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('loads the current subscription state on init', async () => {
    pushNotificationService.isEnabled.mockResolvedValue(true);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('onToggle(true) enables push notifications', async () => {
    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    await fixture.componentInstance.onToggle({checked: true, source: {checked: false}} as MatSlideToggleChange);

    expect(pushNotificationService.enable).toHaveBeenCalled();
    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('onToggle(false) disables push notifications', async () => {
    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    await fixture.componentInstance.onToggle({checked: false, source: {checked: true}} as MatSlideToggleChange);

    expect(pushNotificationService.disable).toHaveBeenCalled();
    expect(fixture.componentInstance.enabled()).toBe(false);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('onToggle reverts the switch and shows an error when the backend call fails', async () => {
    pushNotificationService.enable.mockRejectedValue(new Error('fail'));

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    const event = {checked: true, source: {checked: true}} as MatSlideToggleChange;
    await fixture.componentInstance.onToggle(event);

    expect(event.source.checked).toBe(false);
    expect(toastr.error).toHaveBeenCalled();
  });

});
