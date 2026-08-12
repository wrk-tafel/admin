import type {MockedObject} from 'vitest';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {PushNotificationSettingsComponent} from './push-notification-settings.component';
import {PushDeviceItem, PushNotificationService} from '../../../../common/pwa/push-notification.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {
  PushNotificationType,
  PushTestResult,
  pushNotificationTypeDescription,
  pushNotificationTypeGroups,
  pushNotificationTypeLabel
} from '../../../../api/push-api.service';

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

  // Several flows here chain more than one await - the init effect runs the subscription sync and
  // only then loads the device list, and renaming reloads the list before toasting. A single
  // microtask tick doesn't see those through, so drain them with a macrotask instead.
  const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0));

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
            permissionState: vi.fn().mockReturnValue('granted'),
            syncSubscription: vi.fn().mockResolvedValue(false),
            enable: vi.fn().mockResolvedValue(undefined),
            disable: vi.fn().mockResolvedValue(undefined),
            getDevices: vi.fn().mockResolvedValue([]),
            renameDevice: vi.fn().mockResolvedValue(undefined),
            removeDevice: vi.fn().mockResolvedValue(undefined),
            sendTestNotification: vi.fn().mockResolvedValue(PushTestResult.SENT),
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
    pushNotificationService.syncSubscription.mockResolvedValue(true);
    pushNotificationService.getDevices.mockResolvedValue([testDevice]);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.devices()).toEqual([testDevice]);
  });

  /**
   * The sync may re-register this device, so a device list fetched alongside it reads the backend
   * before that registration lands - which showed as an enabled toggle above an empty list.
   */
  it('fetches the device list only after the subscription sync has finished', async () => {
    const callOrder: string[] = [];
    pushNotificationService.syncSubscription.mockImplementation(async () => {
      callOrder.push('sync');
      return true;
    });
    pushNotificationService.getDevices.mockImplementation(async () => {
      callOrder.push('getDevices');
      return [testDevice];
    });

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

    expect(callOrder).toEqual(['sync', 'getDevices']);
    expect(fixture.componentInstance.devices()).toEqual([testDevice]);
  });

  it('loads devices and preferences even when push is not supported', async () => {
    pushNotificationService.isSupported.mockReturnValue(false);
    pushNotificationService.getDevices.mockResolvedValue([testDevice]);

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

    expect(fixture.componentInstance.devices()).toEqual([testDevice]);
    expect(fixture.componentInstance.preferences()).toEqual(testPreferences);
    expect(fixture.componentInstance.preferencesLoading()).toBe(false);
  });

  it('onToggle(true) enables push notifications', async () => {
    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

    await fixture.componentInstance.onToggle({checked: true, source: {checked: false}} as MatSlideToggleChange);

    expect(pushNotificationService.enable).toHaveBeenCalled();
    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('onToggle(false) disables push notifications', async () => {
    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

    await fixture.componentInstance.onToggle({checked: false, source: {checked: true}} as MatSlideToggleChange);

    expect(pushNotificationService.disable).toHaveBeenCalled();
    expect(fixture.componentInstance.enabled()).toBe(false);
    expect(toastr.success).toHaveBeenCalled();
  });

  describe('notification permission', () => {
    it('reads the browser permission on init and reports it as not blocked when granted', async () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges(); // Trigger effect in constructor
      await flushAsync();

      expect(fixture.componentInstance.notificationPermission()).toEqual('granted');
      expect(fixture.componentInstance.permissionBlocked()).toBe(false);
    });

    it('reports a denied permission as blocked', async () => {
      pushNotificationService.permissionState.mockReturnValue('denied');

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges(); // Trigger effect in constructor
      await flushAsync();

      expect(fixture.componentInstance.permissionBlocked()).toBe(true);
    });

    // An undecided permission still gets the browser's own prompt when the toggle is switched on,
    // so it must not be treated like a block.
    it('does not report an undecided permission as blocked', async () => {
      pushNotificationService.permissionState.mockReturnValue('default');

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges(); // Trigger effect in constructor
      await flushAsync();

      expect(fixture.componentInstance.permissionBlocked()).toBe(false);
    });

    // The prompt is what the enable ran into, so the block is only visible after it failed.
    it('picks up a permission denied in the prompt and explains it instead of failing generically', async () => {
      pushNotificationService.enable.mockRejectedValue(new Error('denied'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges(); // Trigger effect in constructor
      await flushAsync();

      pushNotificationService.permissionState.mockReturnValue('denied');
      await fixture.componentInstance.onToggle({checked: true, source: {checked: true}} as MatSlideToggleChange);

      expect(fixture.componentInstance.permissionBlocked()).toBe(true);
      expect(toastr.error).toHaveBeenCalledWith(expect.stringContaining('blockiert'));
    });
  });

  it('onToggle reverts the switch and shows an error when the backend call fails', async () => {
    pushNotificationService.enable.mockRejectedValue(new Error('fail'));

    const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
    fixture.detectChanges(); // Trigger effect in constructor
    await flushAsync();

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
      await flushAsync();

      fixture.componentInstance.renameDevice(testDevice);
      await flushAsync();

      expect(pushNotificationService.renameDevice).toHaveBeenCalledWith(testDevice.id, 'Tafel 1');
      expect(toastr.success).toHaveBeenCalled();
    });

    it('does nothing when the dialog is cancelled', async () => {
      matDialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      fixture.componentInstance.renameDevice(testDevice);
      await Promise.resolve();

      expect(pushNotificationService.renameDevice).not.toHaveBeenCalled();
    });

    it('shows an error when renaming fails', async () => {
      matDialog.open.mockReturnValue({afterClosed: () => of('Tafel 1')} as any);
      pushNotificationService.renameDevice.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      fixture.componentInstance.renameDevice(testDevice);
      await flushAsync();

      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    it('sends a test notification to the given device and reports success', async () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.sendTestNotification(testDevice);

      expect(pushNotificationService.sendTestNotification).toHaveBeenCalledWith(testDevice.id);
      expect(toastr.success).toHaveBeenCalled();
      expect(fixture.componentInstance.testedDeviceId()).toBeNull();
    });

    it('reports a server without push configuration as an error', async () => {
      pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.NOT_CONFIGURED);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.sendTestNotification(testDevice);

      expect(toastr.error).toHaveBeenCalledWith(expect.stringContaining('nicht konfiguriert'));
      expect(toastr.success).not.toHaveBeenCalled();
    });

    it('reloads the list and disables the toggle when the current device turned out to be expired', async () => {
      pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.EXPIRED);
      pushNotificationService.getDevices.mockResolvedValue([]);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();
      fixture.componentInstance.enabled.set(true);

      await fixture.componentInstance.sendTestNotification(testDevice);

      expect(fixture.componentInstance.enabled()).toBe(false);
      expect(fixture.componentInstance.devices()).toEqual([]);
      expect(toastr.error).toHaveBeenCalled();
    });

    it('keeps the toggle untouched when another device turned out to be expired', async () => {
      const otherDevice: PushDeviceItem = {...testDevice, id: 2, isCurrentDevice: false};
      pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.EXPIRED);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();
      fixture.componentInstance.enabled.set(true);

      await fixture.componentInstance.sendTestNotification(otherDevice);

      expect(fixture.componentInstance.enabled()).toBe(true);
    });

    it('reports a failed send as an error', async () => {
      pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.FAILED);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.sendTestNotification(testDevice);

      expect(toastr.error).toHaveBeenCalled();
    });

    it('shows an error and stops the per-device spinner when the request itself fails', async () => {
      pushNotificationService.sendTestNotification.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.sendTestNotification(testDevice);

      expect(toastr.error).toHaveBeenCalled();
      expect(fixture.componentInstance.testedDeviceId()).toBeNull();
    });

    describe('status shown next to the device', () => {
      it('marks the device as pending while the send is in flight and as successful afterwards', async () => {
        let resolveSend: (result: PushTestResult) => void = () => undefined;
        pushNotificationService.sendTestNotification.mockReturnValue(new Promise<PushTestResult>(resolve => {
          resolveSend = resolve;
        }));

        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        const inFlight = fixture.componentInstance.sendTestNotification(testDevice);
        expect((fixture.componentInstance as any).testStatus(testDevice).state).toEqual('pending');

        resolveSend(PushTestResult.SENT);
        await inFlight;

        expect((fixture.componentInstance as any).testStatus(testDevice)).toEqual({
          state: 'success',
          text: expect.stringContaining('Test gesendet')
        });
      });

      it('marks the device as failed when the server has no push configuration', async () => {
        pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.NOT_CONFIGURED);

        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        await fixture.componentInstance.sendTestNotification(testDevice);

        expect((fixture.componentInstance as any).testStatus(testDevice).state).toEqual('error');
      });

      it('marks the device as failed when the request itself fails', async () => {
        pushNotificationService.sendTestNotification.mockRejectedValue(new Error('fail'));

        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        await fixture.componentInstance.sendTestNotification(testDevice);

        expect((fixture.componentInstance as any).testStatus(testDevice).state).toEqual('error');
      });

      // An expired device leaves the list, so a status left behind under its id would resurface on
      // the next device that happens to get the same id.
      it('drops the status of a device that turned out to be expired', async () => {
        pushNotificationService.sendTestNotification.mockResolvedValue(PushTestResult.EXPIRED);
        pushNotificationService.getDevices.mockResolvedValue([]);

        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        await fixture.componentInstance.sendTestNotification(testDevice);

        expect((fixture.componentInstance as any).testStatus(testDevice)).toBeUndefined();
      });

      it('drops the status of a removed device', async () => {
        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        await fixture.componentInstance.sendTestNotification(testDevice);
        await fixture.componentInstance.removeDevice(testDevice);

        expect((fixture.componentInstance as any).testStatus(testDevice)).toBeUndefined();
      });

      // Testing one device must not relabel the others.
      it('keeps the status per device', async () => {
        const otherDevice: PushDeviceItem = {...testDevice, id: 2, isCurrentDevice: false};

        const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
        fixture.detectChanges();
        await flushAsync();

        await fixture.componentInstance.sendTestNotification(testDevice);

        expect((fixture.componentInstance as any).testStatus(testDevice).state).toEqual('success');
        expect((fixture.componentInstance as any).testStatus(otherDevice)).toBeUndefined();
      });
    });
  });

  describe('removeDevice', () => {
    it('removes the device, reloads the list, and disables the toggle if it was the current device', async () => {
      pushNotificationService.getDevices.mockResolvedValue([]);

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();
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
      await flushAsync();
      fixture.componentInstance.enabled.set(true);

      await fixture.componentInstance.removeDevice(otherDevice);

      expect(fixture.componentInstance.enabled()).toBe(true);
    });

    it('shows an error when removal fails', async () => {
      pushNotificationService.removeDevice.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

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

  describe('device kind', () => {
    // A renamed device shows nothing of its user agent any more, so the icon is what still says
    // what kind of device it is.
    it('picks a phone icon for a mobile device and a computer icon otherwise', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const component = fixture.componentInstance as any;
      const mobile = {...testDevice, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1'};
      const desktop = {...testDevice, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36'};

      expect(component.deviceIcon(mobile)).not.toEqual(component.deviceIcon(desktop));
      expect(component.deviceTypeLabel(mobile)).toEqual('Mobiles Gerät');
      expect(component.deviceTypeLabel(desktop)).toEqual('Computer');
    });

    it('falls back to an unknown kind without a user agent', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const component = fixture.componentInstance as any;

      expect(component.deviceTypeLabel({...testDevice, userAgent: null})).toEqual('Unbekannter Gerätetyp');
    });
  });

  describe('registeredAgo', () => {
    it('describes how long ago the device was registered', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const createdAt = new Date(Date.now() - 3 * 7 * 24 * 60 * 60 * 1000).toISOString();

      expect((fixture.componentInstance as any).registeredAgo({...testDevice, createdAt})).toEqual('vor 3 Wochen');
    });
  });

  describe('typeLabel', () => {
    it('returns the German label for a notification type', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const label = (fixture.componentInstance as any).typeLabel(PushNotificationType.DISTRIBUTION_STARTED);
      expect(label).toEqual('Ausgabe gestartet');
    });

    // The backend decides which types come back, so any type in the enum can turn up in the list -
    // a missing entry would render as an empty toggle label rather than failing anywhere.
    it('has a label and a description for every notification type', () => {
      Object.values(PushNotificationType).forEach(type => {
        expect(pushNotificationTypeLabel[type]).toBeTruthy();
        expect(pushNotificationTypeDescription[type]).toBeTruthy();
      });
    });
  });

  describe('typeGroups', () => {
    // The screen renders groups, not the raw response, so a type missing from the grouping would
    // silently never appear - no error, just an option nobody can find.
    it('assigns every notification type to exactly one group', () => {
      const grouped = pushNotificationTypeGroups.flatMap(group => group.types);

      expect([...grouped].sort()).toEqual(Object.values(PushNotificationType).sort());
    });

    it('groups the receivable types in the configured order', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.componentInstance.preferences.set({
        masterEnabled: true,
        types: [
          // Deliberately in the response's own (enum) order, which is not the display order.
          {type: PushNotificationType.DISTRIBUTION_CLOSED, enabled: true},
          {type: PushNotificationType.USER_LOCKED_OUT, enabled: true},
          {type: PushNotificationType.CHECKIN_STARTED, enabled: true},
          {type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true}
        ]
      });

      expect(fixture.componentInstance.typeGroups()).toEqual([
        {
          title: 'Ablauf der Ausgabe',
          items: [
            {type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true},
            {type: PushNotificationType.CHECKIN_STARTED, enabled: true},
            {type: PushNotificationType.DISTRIBUTION_CLOSED, enabled: true}
          ]
        },
        {
          title: 'Technisches',
          items: [{type: PushNotificationType.USER_LOCKED_OUT, enabled: true}]
        }
      ]);
    });

    /**
     * The permission filtering happens server-side, so a group can come back with nothing in it -
     * showing its heading above an empty space would suggest something failed to load.
     */
    it('drops a group whose types this user cannot receive', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.componentInstance.preferences.set({
        masterEnabled: true,
        types: [{type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true}]
      });

      expect(fixture.componentInstance.typeGroups().map(group => group.title)).toEqual(['Ablauf der Ausgabe']);
    });
  });

  describe('typeDescription', () => {
    it('returns the German description for a notification type', () => {
      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      const description = (fixture.componentInstance as any).typeDescription(PushNotificationType.DISTRIBUTION_STILL_OPEN);
      expect(description).toContain('noch nicht beendet');
    });
  });

  describe('onMasterToggle', () => {
    it('updates the preferences and shows a success toast when enabling', async () => {
      pushNotificationService.setMasterEnabled.mockResolvedValue({masterEnabled: true, types: []});

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.onMasterToggle({checked: true, source: {checked: true}} as MatSlideToggleChange);

      expect(pushNotificationService.setMasterEnabled).toHaveBeenCalledWith(true);
      expect(fixture.componentInstance.preferences()).toEqual({masterEnabled: true, types: []});
      expect(toastr.success).toHaveBeenCalled();
    });

    it('updates the preferences and shows a success toast when disabling', async () => {
      pushNotificationService.setMasterEnabled.mockResolvedValue({masterEnabled: false, types: []});

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

      await fixture.componentInstance.onMasterToggle({checked: false, source: {checked: false}} as MatSlideToggleChange);

      expect(pushNotificationService.setMasterEnabled).toHaveBeenCalledWith(false);
      expect(fixture.componentInstance.preferences()).toEqual({masterEnabled: false, types: []});
      expect(toastr.success).toHaveBeenCalled();
    });

    it('reverts the switch and shows an error when the backend call fails', async () => {
      pushNotificationService.setMasterEnabled.mockRejectedValue(new Error('fail'));

      const fixture = TestBed.createComponent(PushNotificationSettingsComponent);
      fixture.detectChanges();
      await flushAsync();

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
      await flushAsync();

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
      await flushAsync();

      const event = {checked: false, source: {checked: false}} as MatSlideToggleChange;
      await fixture.componentInstance.onTypeToggle(PushNotificationType.DISTRIBUTION_STARTED, event);

      expect(event.source.checked).toBe(true);
      expect(toastr.error).toHaveBeenCalled();
    });
  });

});
