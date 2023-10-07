import {TestBed, waitForAsync} from '@angular/core/testing';
import {TafelPaginationComponent} from './tafel-pagination.component';

describe('TafelPaginationComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [],
      declarations: [TafelPaginationComponent]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

});
