import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenFullscreenComponent} from './ticket-screen-fullscreen.component';

describe('TicketScreenFullscreenComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenFullscreenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
