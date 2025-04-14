import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenComponent, TicketScreenText} from './ticket-screen.component';
import {of} from 'rxjs';
import {SseService} from '../../../../common/sse/sse.service';

describe('TicketScreenComponent', () => {
  let sseService: jasmine.SpyObj<SseService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: SseService,
          useValue: jasmine.createSpyObj('SseService', ['listen'])
        }
      ]
    }).compileComponents();

    sseService = TestBed.inject(SseService) as jasmine.SpyObj<SseService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('data change fills states correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;

    const testData: TicketScreenText = {text: 'Test Text', value: 'Test Value'};
    sseService.listen.and.returnValue(of(testData));

    component.ngOnInit();

    expect(sseService.listen).toHaveBeenCalledWith('/distributions/ticket-screen/sse/current');
    expect(component.text).toBe(testData.text);
    expect(component.value).toBe(testData.value);
  });

});
