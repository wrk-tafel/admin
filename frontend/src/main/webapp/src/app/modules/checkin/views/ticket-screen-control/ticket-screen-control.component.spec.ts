import type {MockedObject} from 'vitest';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {UrlHelperService} from '../../../../common/util/url-helper.service';
import {
  DistributionTicketScreenApiService,
  TicketScreenTicketResponse
} from '../../../../api/distribution-ticket-screen-api.service';
import {of, throwError} from 'rxjs';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDialog} from '@angular/material/dialog';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {CustomerApiService, CustomerData, Gender} from '../../../../api/customer-api.service';
import {
  PayCostContributionDialogComponent
} from '../../../../common/components/pay-cost-contribution-dialog/pay-cost-contribution-dialog.component';
import {
  EditCostContributionDialogComponent
} from '../../../../common/components/edit-cost-contribution-dialog/edit-cost-contribution-dialog.component';

const emptyTicket: TicketScreenTicketResponse = {ticketNumber: null, householdId: null, pendingCostContribution: null};

describe('TicketScreenControlComponent', () => {
  let distributionTicketScreenApiService: MockedObject<DistributionTicketScreenApiService>;
  let customerApiService: MockedObject<CustomerApiService>;
  let urlHelperSpy: MockedObject<UrlHelperService>;
  let toastr: MockedObject<TafelToastrService>;

  const mockCustomer: CustomerData = {
    id: 100,
    lastname: 'Mustermann',
    firstname: 'Max',
    gender: Gender.MALE,
    address: {},
    pendingCostContribution: 0
  };

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, TicketScreenComponent],
      providers: [
        {
          provide: DistributionTicketScreenApiService,
          useValue: {
            showText: vi.fn().mockName('DistributionTicketScreenApiService.showText'),
            // the component fetches the current ticket on construction (see the component's
            // constructor), so this needs a default return value or every test that doesn't
            // care about it would otherwise crash on TestBed.createComponent
            getCurrentTicket: vi.fn().mockReturnValue(of(emptyTicket)).mockName('DistributionTicketScreenApiService.getCurrentTicket'),
            showCurrentTicket: vi.fn().mockReturnValue(of(emptyTicket)).mockName('DistributionTicketScreenApiService.showCurrentTicket'),
            showPreviousTicket: vi.fn().mockName('DistributionTicketScreenApiService.showPreviousTicket'),
            showNextTicket: vi.fn().mockName('DistributionTicketScreenApiService.showNextTicket')
          }
        },
        {
          provide: CustomerApiService,
          useValue: {
            payCostContribution: vi.fn().mockName('CustomerApiService.payCostContribution'),
            editCostContribution: vi.fn().mockName('CustomerApiService.editCostContribution')
          }
        },
        {
          provide: UrlHelperService,
          useValue: {
            getBaseUrl: vi.fn().mockName('UrlHelperService.getBaseUrl')
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({afterClosed: () => of(undefined)}),
            openDialogs: []
          }
        }
      ]
    }).compileComponents();

    distributionTicketScreenApiService =
      TestBed.inject(DistributionTicketScreenApiService) as MockedObject<DistributionTicketScreenApiService>;
    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    urlHelperSpy = TestBed.inject(UrlHelperService) as MockedObject<UrlHelperService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('fetches the current ticket read-only on init, without broadcasting anything to the monitor', () => {
    const response: TicketScreenTicketResponse = {ticketNumber: 5, householdId: 100, pendingCostContribution: 20};
    distributionTicketScreenApiService.getCurrentTicket.mockReturnValue(of(response));

    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;

    expect(distributionTicketScreenApiService.getCurrentTicket).toHaveBeenCalled();
    // the broadcasting variant must not fire on load - it would overwrite what the monitor shows
    expect(distributionTicketScreenApiService.showCurrentTicket).not.toHaveBeenCalled();
    expect(component.currentTicket()).toEqual(response);
  });

  it('openScreenInNewTab', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;

    const testBaseUrl = 'http://test:1234/testcontext';
    urlHelperSpy.getBaseUrl.mockReturnValue(testBaseUrl);
    vi.spyOn(window, 'open');

    component.openScreenInNewTab();

    expect(window.open).toHaveBeenCalledWith(`${testBaseUrl}/anmeldung/ticketmonitor`, '_blank');
  });

  it('showStartTime', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(of(undefined));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    component.showStartTime();

    expect(distributionTicketScreenApiService.showText).toHaveBeenCalledWith('Startzeit', startTime);
  });

  it('showCurrentTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(of(emptyTicket));

    component.showCurrentTicket();

    expect(distributionTicketScreenApiService.showCurrentTicket).toHaveBeenCalled();
  });

  it('showCurrentTicket stores the response for the cost-contribution panel', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    const response: TicketScreenTicketResponse = {ticketNumber: 5, householdId: 100, pendingCostContribution: 20};
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(of(response));

    component.showCurrentTicket();

    expect(component.currentTicket()).toEqual(response);
  });

  it('showPreviousTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(emptyTicket));

    component.showPreviousTicket();

    expect(distributionTicketScreenApiService.showPreviousTicket).toHaveBeenCalled();
  });

  it('showNextTicket with costContributionPaid true', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

    component.showNextTicket(true);

    expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(true);
  });

  it('showNextTicket with costContributionPaid false', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

    component.showNextTicket(false);

    expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(false);
  });

  it('showStartTime handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(throwError(() => new Error('API Error')));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    component.showStartTime();

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen der Startzeit!');
  });

  it('showCurrentTicket handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(throwError(() => new Error('API Error')));

    component.showCurrentTicket();

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen des aktuellen Tickets!');
  });

  it('showNextTicket handles errors and shows toast', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(throwError(() => new Error('API Error')));

    component.showNextTicket(false);

    expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen des nächsten Tickets!');
  });

  it('showStartTime manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showText.mockReturnValue(of(undefined));

    const startTime = '19:00';
    component.startTimeFormModel.set({
      startTime: startTime
    });

    expect(component.isShowingStartTime()).toBe(false);
    component.showStartTime();
    expect(component.isShowingStartTime()).toBe(false); // finalize resets it
  });

  it('showCurrentTicket manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showCurrentTicket.mockReturnValue(of(emptyTicket));

    expect(component.isShowingCurrentTicket()).toBe(false);
    component.showCurrentTicket();
    expect(component.isShowingCurrentTicket()).toBe(false); // finalize resets it
  });

  it('showNextTicket manages loading state correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

    expect(component.isShowingNextTicket()).toBe(false);
    component.showNextTicket(false);
    expect(component.isShowingNextTicket()).toBe(false); // finalize resets it
  });

  describe('cost contribution debt of the current ticket holder', () => {
    it('pay cost contribution - all', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({ticketNumber: 5, householdId: 100, pendingCostContribution: 20});

      const expectedCustomer = {...mockCustomer, pendingCostContribution: 0};
      customerApiService.payCostContribution.mockReturnValue(of(expectedCustomer));

      component.payCostContributionAll();

      expect(customerApiService.payCostContribution).toHaveBeenCalledWith(100, undefined);
      expect(component.currentTicket()?.pendingCostContribution).toEqual(0);
      expect(toastr.success).toHaveBeenCalledWith('Unkostenbeitrag wurde aktualisiert!');
    });

    it('pay cost contribution - specific amount via dialog', () => {
      const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
      matDialog.open.mockReturnValue({afterClosed: () => of(4)} as any);

      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({ticketNumber: 5, householdId: 100, pendingCostContribution: 20});

      const expectedCustomer = {...mockCustomer, pendingCostContribution: 16};
      customerApiService.payCostContribution.mockReturnValue(of(expectedCustomer));

      component.openPayCostContributionDialog();

      expect(matDialog.open).toHaveBeenCalledWith(PayCostContributionDialogComponent, {data: {pendingAmount: 20}});
      expect(customerApiService.payCostContribution).toHaveBeenCalledWith(100, 4);
      expect(component.currentTicket()?.pendingCostContribution).toEqual(16);
    });

    it('edit cost contribution to an arbitrary amount via dialog', () => {
      const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
      matDialog.open.mockReturnValue({afterClosed: () => of(75)} as any);

      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({ticketNumber: 5, householdId: 100, pendingCostContribution: 0});

      const expectedCustomer = {...mockCustomer, pendingCostContribution: 75};
      customerApiService.editCostContribution.mockReturnValue(of(expectedCustomer));

      component.openEditCostContributionDialog();

      expect(matDialog.open).toHaveBeenCalledWith(EditCostContributionDialogComponent, {data: {pendingAmount: 0}});
      expect(customerApiService.editCostContribution).toHaveBeenCalledWith(100, 75);
      expect(component.currentTicket()?.pendingCostContribution).toEqual(75);
    });

    it('pay cost contribution error shows toast', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({ticketNumber: 5, householdId: 100, pendingCostContribution: 20});

      customerApiService.payCostContribution.mockReturnValue(throwError(() => ({status: 500, error: {detail: 'boom'}})));

      component.payCostContributionAll();

      expect(toastr.error).toHaveBeenCalledWith('boom', 'Aktualisierung fehlgeschlagen!');
    });
  });

  describe('queue context (remaining/processed tickets)', () => {
    it('is null while the backend has not sent counts (e.g. no active distribution)', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({ticketNumber: null, householdId: null, pendingCostContribution: null});

      expect(component.queueRemaining()).toBeNull();
    });

    it('is the difference between total and processed once the backend sends both', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentTicket.set({
        ticketNumber: 5,
        householdId: 100,
        pendingCostContribution: 0,
        processedTicketsCount: 3,
        totalTicketsCount: 10
      });

      expect(component.queueRemaining()).toEqual(7);
    });
  });

  describe('"Monitor zeigt" segmented control', () => {
    it('defaults to "current" - matching the ticket fetched automatically on load', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;

      expect(component.monitorMode()).toEqual('current');
    });

    it('switches to "startTime" without showing anything yet when that segment is picked', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;

      component.selectStartTimeMode();

      expect(component.monitorMode()).toEqual('startTime');
      expect(distributionTicketScreenApiService.showText).not.toHaveBeenCalled();
    });

    it('stays on "current" when the back arrow reopens a ticket - the reopened ticket is the current one again', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.monitorMode.set('startTime');
      distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(emptyTicket));

      component.showPreviousTicket();

      expect(component.monitorMode()).toEqual('current');
    });

    it('switches back to "current" once "Weiter" (next ticket) succeeds', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.monitorMode.set('startTime');
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

      component.showNextTicket(true);

      expect(component.monitorMode()).toEqual('current');
    });

    it('switches to "startTime" once the start time is shown successfully', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.monitorMode.set('current');
      distributionTicketScreenApiService.showText.mockReturnValue(of(undefined));
      component.startTimeFormModel.set({startTime: '19:00'});

      component.showStartTime();

      expect(component.monitorMode()).toEqual('startTime');
    });
  });

  describe('back/forward arrows (step through the queue without a new paid/unpaid decision)', () => {
    it('going back reopens a ticket and arms the forward arrow', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(emptyTicket));

      expect(component.stepsBack()).toEqual(0);

      component.showPreviousTicket();

      expect(distributionTicketScreenApiService.showPreviousTicket).toHaveBeenCalled();
      expect(component.stepsBack()).toEqual(1);
    });

    it('the forward arrow advances without a paid/unpaid decision (null) and consumes one step back', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(emptyTicket));
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));
      component.showPreviousTicket();

      component.showNextTicketAgain();

      expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(null);
      expect(component.stepsBack()).toEqual(0);
    });

    it('a "Weiter" advance with an explicit decision also consumes a step back', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(of(emptyTicket));
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));
      component.showPreviousTicket();
      component.showPreviousTicket();

      component.showNextTicket(true);

      expect(component.stepsBack()).toEqual(1);
    });

    it('steps back never go negative, so the forward arrow stays disarmed on plain advances', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

      component.showNextTicket(true);
      component.showNextTicket(false);

      expect(component.stepsBack()).toEqual(0);
    });

    it('a failed back navigation does not arm the forward arrow', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      distributionTicketScreenApiService.showPreviousTicket.mockReturnValue(throwError(() => new Error('API Error')));

      component.showPreviousTicket();

      expect(component.stepsBack()).toEqual(0);
      expect(toastr.error).toHaveBeenCalledWith('Fehler beim Anzeigen des vorherigen Tickets!');
    });
  });

  describe('keyboard shortcuts (Enter = bezahlt, N = nicht bezahlt)', () => {
    function keydown(key: string, target?: EventTarget, extra: Partial<KeyboardEventInit> = {}): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {key, cancelable: true, ...extra});
      if (target) {
        Object.defineProperty(event, 'target', {value: target});
      }
      return event;
    }

    it('Enter shows the next ticket as paid', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

      component.handleKeyboardShortcut(keydown('Enter'));

      expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(true);
    });

    it('"n" shows the next ticket as not paid', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      distributionTicketScreenApiService.showNextTicket.mockReturnValue(of(emptyTicket));

      component.handleKeyboardShortcut(keydown('n'));

      expect(distributionTicketScreenApiService.showNextTicket).toHaveBeenCalledWith(false);
    });

    it('is ignored while a form field has focus, so typing is not hijacked', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      const input = document.createElement('input');

      component.handleKeyboardShortcut(keydown('Enter', input));
      component.handleKeyboardShortcut(keydown('n', input));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });

    it('is ignored while a button has focus, so activating it does not also trigger the shortcut', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      const button = document.createElement('button');

      component.handleKeyboardShortcut(keydown('Enter', button));
      component.handleKeyboardShortcut(keydown('n', button));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });

    it('is ignored while a mat-button-toggle has focus', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      const toggle = document.createElement('mat-button-toggle');
      const innerButton = document.createElement('button');
      toggle.appendChild(innerButton);

      component.handleKeyboardShortcut(keydown('Enter', innerButton));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });

    it('is ignored while a dialog is open', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);
      const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
      (matDialog as any).openDialogs = [{}];

      component.handleKeyboardShortcut(keydown('Enter'));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });

    it('is ignored with a modifier key held, so browser/OS shortcuts are not hijacked', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal({id: 1, startedAt: '', endedAt: null} as any);

      component.handleKeyboardShortcut(keydown('n', undefined, {ctrlKey: true}));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });

    it('is ignored while there is no active distribution', () => {
      const fixture = TestBed.createComponent(TicketScreenControlComponent);
      const component = fixture.componentInstance;
      component.currentDistribution = signal(null);

      component.handleKeyboardShortcut(keydown('Enter'));

      expect(distributionTicketScreenApiService.showNextTicket).not.toHaveBeenCalled();
    });
  });

});
