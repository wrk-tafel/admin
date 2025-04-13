import {TestBed, waitForAsync} from '@angular/core/testing';
import {DashboardComponent, DashboardData} from './dashboard.component';
import {of} from 'rxjs';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SseService} from '../../common/sse/sse.service';

describe('DashboardComponent', () => {
  let sseService: jasmine.SpyObj<SseService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SseService,
          useValue: jasmine.createSpyObj('SseService', ['listen'])
        }
      ]
    }).compileComponents();

    sseService = TestBed.inject(SseService) as jasmine.SpyObj<SseService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('init subscribes data', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    const mockData: DashboardData = {
      registeredCustomers: 123,
      logistics: {
        foodAmountTotal: 456,
        foodCollectionsRecordedCount: 789,
        foodCollectionsTotalCount: 654
      },
      statistics: {
        employeeCount: 10,
        selectedShelterNames: ['Shelter 1', 'Shelter 2', 'Shelter 3'],
      }
    };
    sseService.listen.and.returnValues(of(mockData));

    component.ngOnInit();

    expect(component.data).toEqual(mockData);
  });

});
