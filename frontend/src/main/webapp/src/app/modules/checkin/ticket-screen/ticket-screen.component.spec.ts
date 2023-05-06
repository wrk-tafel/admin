import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenComponent} from './ticket-screen.component';

describe('TicketScreenComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
