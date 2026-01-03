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
    expect(fixture.debugElement.query(By.css('[testid="recorded-food-collections-count"]')).nativeElement.textContent).toBe(`-`);
  });

  it('panel color primary without active distribution', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;

    const color = component.panelColor();
    expect(color).toBe('primary');
  });

  it('panel color warning when not all data is recorded', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    component.distribution.set({id: 123, startedAt: new Date()});
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 2);
    componentRef.setInput('countTotal', 5);

    const color = component.panelColor();
    expect(color).toBe('warning');
  });

  it('panel color success when all data is recorded', () => {
    const fixture = TestBed.createComponent(RecordedFoodCollectionsComponent);
    const component = fixture.componentInstance;
    component.distribution.set({id: 123, startedAt: new Date()});
    const componentRef = fixture.componentRef;
    componentRef.setInput('countRecorded', 5);
    componentRef.setInput('countTotal', 5);

    const color = component.panelColor();
    expect(color).toBe('success');
  });

});
