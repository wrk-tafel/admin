import {TestBed, waitForAsync} from '@angular/core/testing';
import {RecordedFoodCollectionsComponent} from './recorded-food-collections.component';
import {By} from '@angular/platform-browser';
import {CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('RecordedFoodCollectionsComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        ColComponent,
        RowComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('recorded food collections count rendered', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe(`2 / 5`);
  });

  it('recorded food collections count rendered without active distribution', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe(`- / -`);
  });

});
