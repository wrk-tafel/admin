import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenWindowComponent} from './ticket-screen-window.component';

describe('TicketScreenWindowComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenWindowComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
