import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {SendMailsComponent} from './send-mails.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {of, throwError} from 'rxjs';

describe('SendMailsComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let toastr: MockedObject<TafelToastrService>;

  const testDistributions: DistributionItem[] = [
    {id: 1, startedAt: new Date('2026-01-01')},
    {id: 2, startedAt: new Date('2026-02-01')}
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: DistributionApiService,
          useValue: {
            getDistributions: vi.fn().mockName('DistributionApiService.getDistributions').mockReturnValue(of({items: []})),
            sendMails: vi.fn().mockName('DistributionApiService.sendMails')
          }
        },
        {provide: TafelToastrService, useValue: {error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn()}}
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('loads distributions and preselects the first one', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.distributions()).toEqual(testDistributions);
    expect(component.selectedDistribution()).toEqual(testDistributions[0]);
  });

  it('leaves selectedDistribution unset when there are no distributions', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: []}));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.distributions()).toEqual([]);
    expect(component.selectedDistribution()).toBeNull();
  });

  it('sendMails does nothing when no distribution is selected', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: []}));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.sendMails();

    expect(distributionApiService.sendMails).not.toHaveBeenCalled();
  });

  it('sendMails sends mails for the selected distribution and shows a success toast', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.sendMails();

    expect(distributionApiService.sendMails).toHaveBeenCalledWith(testDistributions[0].id);
    expect(toastr.success).toHaveBeenCalledWith('E-Mails wurden erneut verschickt!');
  });

  it('sendMails shows an error toast when sending fails', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.sendMails();

    expect(toastr.error).toHaveBeenCalledWith('Senden der E-Mails fehlgeschlagen!');
  });

  it('sendMails uses the currently selected distribution after it is changed', () => {
    distributionApiService.getDistributions.mockReturnValue(of({items: testDistributions}));
    distributionApiService.sendMails.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(SendMailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.selectedDistribution.set(testDistributions[1]);
    component.sendMails();

    expect(distributionApiService.sendMails).toHaveBeenCalledWith(testDistributions[1].id);
  });

});
