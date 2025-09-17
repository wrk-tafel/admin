import {TestBed} from '@angular/core/testing';
import {TicketsProcessedComponent} from './tickets-processed.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideZonelessChangeDetection} from "@angular/core";

describe('TicketsProcessedComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketsProcessedComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('counts rendered', async () => {
    const fixture = TestBed.createComponent(TicketsProcessedComponent);
    const componentRef = fixture.componentRef;

    const countProcessed = 123;
    const countTotal = 200;
    componentRef.setInput('countProcessedTickets', countProcessed);
    componentRef.setInput('countTotalTickets', countTotal);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('[testid="tickets-processed-count"]')).nativeElement.textContent)
      .toBe(`${countProcessed} / ${countTotal}`);
  });

  it('panel color primary when not initialized', async () => {
    const fixture = TestBed.createComponent(TicketsProcessedComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;

    const countProcessed = 0;
    const countTotal = 0;
    componentRef.setInput('countProcessedTickets', countProcessed);
    componentRef.setInput('countTotalTickets', countTotal);
    await fixture.whenStable();

    expect(component.getPanelColor()).toBe('primary');
  });

  it('panel color warning when tickets are still open', async () => {
    const fixture = TestBed.createComponent(TicketsProcessedComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;

    const countProcessed = 10;
    const countTotal = 20;
    componentRef.setInput('countProcessedTickets', countProcessed);
    componentRef.setInput('countTotalTickets', countTotal);
    await fixture.whenStable();

    expect(component.getPanelColor()).toBe('warning');
  });

  it('panel color success when all tickets are processed', async () => {
    const fixture = TestBed.createComponent(TicketsProcessedComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;

    const countProcessed = 20;
    const countTotal = 20;
    componentRef.setInput('countProcessedTickets', countProcessed);
    componentRef.setInput('countTotalTickets', countTotal);
    await fixture.whenStable();

    expect(component.getPanelColor()).toBe('success');
  });

});
