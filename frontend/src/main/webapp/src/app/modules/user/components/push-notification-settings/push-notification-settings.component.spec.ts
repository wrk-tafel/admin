import type {MockedObject} from 'vitest';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {PushNotificationSettingsComponent} from './push-notification-settings.component';
import {PushDeviceItem, PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {PushNotificationType} from '../../../../api/push-api.service';

describe('PushNotificationSettingsComponent', () => {
  let pushNotificationService: MockedObject<PushNotificationService>;
  let toastr: MockedObject<TafelToastrService>;
  let matDialog: MockedObject<MatDialog>;

  const testDevice: PushDeviceItem = {
    id: 1,
    userAgent: 'Mozilla/5.0 Chrome/128',
    label: null,
    createdAt: '2026-01-01T12:00:00',
    isCurrentDevice: true
  };

  const testPreferences = {
    masterEnabled: true,
    types: [
      {type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true},
      {type: PushNotificationType.DISTRIBUTION_CLOSED, enabled: false}
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PushNotificationService,
          useValue: {
            isSupported: vi.fn().mockReturnValue(true),
            isEnabled: vi.fn().mockResolvedValue(false),
            enable: vi.fn().mockResolvedValue(undefined),
            disable: vi.fn().mockResolvedValue(undefined),
            getDevices: vi.fn().mockResolvedValue([]),
            renameDevice: vi.fn().mockResolvedValue(undefined),
            removeDevice: vi.fn().mockResolvedValue(undefined),
            getPreferences: vi.fn().mockResolvedValue(testPreferences),
            setMasterEnabled: vi.fn().mockResolvedValue(testPreferences),
            setTypeEnabled: vi.fn().mockResolvedValue(testPreferences)
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn(),
            success: vi.fn()
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({afterClosed: () => of(undefined)})
          }
        }
      ]
    }).compileComponents();

    pushNotificationService = TestBed.inject(PushNotificationService) as MockedObject<PushNotificationService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
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

  it('loads the current subscription state and devices on init', async () => {
    pushNotificationService.isEnabled.mockResolvedValue(true);
    pushNotificationService.getDevices.mockResolvedValue([testDevice]);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.devices()).toEqual([testDevice]);
  });

  it('loads devices and preferences even when push is not supported', async () => {
    pushNotificationService.isSupported.mockReturnValue(false);
    pushNotificationService.getDevices.mockResolvedValue([testDevice]);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await Promise.resolve();

    expect(fixture.componentInstance.devices()).toEqual([testDevice]);
    expect(fixture.componentInstance.preferences()).toEqual(testPreferences);
    expect(fixture.componentInstance.preferencesLoading()).toBe(false);
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

  describe('renameDevice', () => {
    it('renames the device and reloads the list when the dialog is confirmed', async () => {
      matDialog.open.mockReturnValue({afterClosed: () => of('Tafel 1')} as any);
      pushNotificationService.getDevices.mockResolvedValue([{...testDevice, label: 'Tafel 1'}]);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      fixture.componentInstance.renameDevice(testDevice);
      await fixture.whenStable();

      expect(pushNotificationService.renameDevice).toHaveBeenCalledWith(testDevice.id, 'Tafel 1');
      expect(toastr.success).toHaveBeenCalled();
    });

    it('does nothing when the dialog is cancelled', async () => {
      matDialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      fixture.componentInstance.renameDevice(testDevice);
      await Promise.resolve();

      expect(pushNotificationService.renameDevice).not.toHaveBeenCalled();
    });

    it('shows an error when renaming fails', async () => {
      matDialog.open.mockReturnValue({afterClosed: () => of('Tafel 1')} as any);
      pushNotificationService.renameDevice.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      fixture.componentInstance.renameDevice(testDevice);
      await fixture.whenStable();

      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('removeDevice', () => {
    it('removes the device, reloads the list, and disables the toggle if it was the current device', async () => {
      pushNotificationService.getDevices.mockResolvedValue([]);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();
      fixture.componentInstance.enabled.set(true);

      await fixture.componentInstance.removeDevice(testDevice);

      expect(pushNotificationService.removeDevice).toHaveBeenCalledWith(testDevice);
      expect(fixture.componentInstance.enabled()).toBe(false);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('does not touch the toggle when removing a different device', async () => {
      const otherDevice: PushDeviceItem = {...testDevice, id: 2, isCurrentDevice: false};

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();
      fixture.componentInstance.enabled.set(true);

      await fixture.componentInstance.removeDevice(otherDevice);

      expect(fixture.componentInstance.enabled()).toBe(true);
    });

    it('shows an error when removal fails', async () => {
      pushNotificationService.removeDevice.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      await fixture.componentInstance.removeDevice(testDevice);

      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('deviceLabel', () => {
    it('prefers the custom label over the user-agent-derived one', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const label = (fixture.componentInstance as any).deviceLabel({...testDevice, label: 'Tafel 1'});
      expect(label).toEqual('Tafel 1');
    });

    it('falls back to the user-agent-derived label when no custom label is set', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const label = (fixture.componentInstance as any).deviceLabel(testDevice);
      expect(label).toContain('Chrome');
    });
  });

  describe('typeLabel', () => {
    it('returns the German label for a notification type', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const label = (fixture.componentInstance as any).typeLabel(PushNotificationType.DISTRIBUTION_STARTED);
      expect(label).toEqual('Ausgabe gestartet');
    });
  });

  describe('onMasterToggle', () => {
    it('updates the preferences and shows a success toast when enabling', async () => {
      pushNotificationService.setMasterEnabled.mockResolvedValue({masterEnabled: true, types: []});

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      await fixture.componentInstance.onMasterToggle({checked: true, source: {checked: true}} as MatSlideToggleChange);

      expect(pushNotificationService.setMasterEnabled).toHaveBeenCalledWith(true);
      expect(fixture.componentInstance.preferences()).toEqual({masterEnabled: true, types: []});
      expect(toastr.success).toHaveBeenCalled();
    });

    it('updates the preferences and shows a success toast when disabling', async () => {
      pushNotificationService.setMasterEnabled.mockResolvedValue({masterEnabled: false, types: []});

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      await fixture.componentInstance.onMasterToggle({checked: false, source: {checked: false}} as MatSlideToggleChange);

      expect(pushNotificationService.setMasterEnabled).toHaveBeenCalledWith(false);
      expect(fixture.componentInstance.preferences()).toEqual({masterEnabled: false, types: []});
      expect(toastr.success).toHaveBeenCalled();
    });

    it('reverts the switch and shows an error when the backend call fails', async () => {
      pushNotificationService.setMasterEnabled.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      const event = {checked: false, source: {checked: false}} as MatSlideToggleChange;
      await fixture.componentInstance.onMasterToggle(event);

      expect(event.source.checked).toBe(testPreferences.masterEnabled);
      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('onTypeToggle', () => {
    it('updates the preferences and shows a success toast', async () => {
      const updated = {
        masterEnabled: true,
        types: [{type: PushNotificationType.DISTRIBUTION_STARTED, enabled: false}]
      };
      pushNotificationService.setTypeEnabled.mockResolvedValue(updated);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      await fixture.componentInstance.onTypeToggle(
        PushNotificationType.DISTRIBUTION_STARTED,
        {checked: false, source: {checked: false}} as MatSlideToggleChange
      );

      expect(pushNotificationService.setTypeEnabled).toHaveBeenCalledWith(PushNotificationType.DISTRIBUTION_STARTED, false);
      expect(fixture.componentInstance.preferences()).toEqual(updated);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('reverts the switch and shows an error when the backend call fails', async () => {
      pushNotificationService.setTypeEnabled.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await Promise.resolve();

      const event = {checked: false, source: {checked: false}} as MatSlideToggleChange;
      await fixture.componentInstance.onTypeToggle(PushNotificationType.DISTRIBUTION_STARTED, event);

      expect(event.source.checked).toBe(true);
      expect(toastr.error).toHaveBeenCalled();
    });
  });

});
