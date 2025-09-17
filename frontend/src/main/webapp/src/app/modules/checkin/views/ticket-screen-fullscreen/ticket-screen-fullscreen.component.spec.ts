import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenFullscreenComponent} from './ticket-screen-fullscreen.component';
import {SseService} from '../../../../common/sse/sse.service';
import {BehaviorSubject, of} from 'rxjs';
import {provideZonelessChangeDetection} from "@angular/core";

describe('TicketScreenFullscreenComponent', () => {
  let sseService: jasmine.SpyObj<SseService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: SseService,
          useValue: jasmine.createSpyObj('SseService', ['listen'])
        }
      ]
    }).compileComponents();

    sseService = TestBed.inject(SseService) as jasmine.SpyObj<SseService>;
    
    // Setup mock for SseService to return empty BehaviorSubject
    const mockTicketScreenText = { text: 'Test', value: 'Test Value' };
    sseService.listen.and.returnValue(new BehaviorSubject(mockTicketScreenText));
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenFullscreenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
