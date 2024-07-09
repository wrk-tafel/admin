import {TestBed, waitForAsync} from '@angular/core/testing';
import {TafelPaginationComponent} from './tafel-pagination.component';
import {PaginationComponent, PaginationModule} from '@coreui/angular';

describe('TafelPaginationComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        PaginationModule,
        PaginationComponent
      ],
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

  it('pagination for single page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    component.paginationData = {
      count: 5,
      totalCount: 5,
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    };

    expect(component.currentPage).toBe(1);
    expect(component.maxPage).toBe(1);
    expect(component.text).toBe('1 - 5 von 5');
  }));

  it('pagination for multiple pages, selected first page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    component.paginationData = {
      count: 5,
      totalCount: 50,
      currentPage: 1,
      totalPages: 10,
      pageSize: 10
    };

    expect(component.currentPage).toBe(1);
    expect(component.maxPage).toBe(10);
    expect(component.text).toBe('1 - 5 von 50');
  }));

  it('pagination for multiple pages, selected second page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    component.paginationData = {
      count: 10,
      totalCount: 30,
      currentPage: 2,
      totalPages: 2,
      pageSize: 10
    };

    expect(component.currentPage).toBe(2);
    expect(component.maxPage).toBe(2);
    expect(component.text).toBe('11 - 20 von 30');
  }));

  it('pagination for multiple pages, selected last page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    component.paginationData = {
      count: 8,
      totalCount: 28,
      currentPage: 3,
      totalPages: 3,
      pageSize: 10
    };

    expect(component.currentPage).toBe(3);
    expect(component.maxPage).toBe(3);
    expect(component.text).toBe('21 - 28 von 28');
  }));

  it('selectFirstPage', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');

    component.selectFirstPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(1);
  }));

  it('selectPreviousPage', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');
    component.currentPage = 5;

    component.selectPreviousPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(4);
  }));

  it('selectPreviousPage on first page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');
    component.currentPage = 1;

    component.selectPreviousPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(1);
  }));

  it('selectNextPage', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');
    component.maxPage = 10;
    component.currentPage = 4;

    component.selectNextPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(5);
  }));

  it('selectNextPage on last page', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');
    component.maxPage = 10;
    component.currentPage = 10;

    component.selectNextPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(10);
  }));

  it('selectLastPage', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelPaginationComponent);
    const component = fixture.componentInstance;
    spyOn(component.pageChanged, 'emit');
    component.maxPage = 7;

    component.selectLastPage();

    expect(component.pageChanged.emit).toHaveBeenCalledWith(7);
  }));

});
