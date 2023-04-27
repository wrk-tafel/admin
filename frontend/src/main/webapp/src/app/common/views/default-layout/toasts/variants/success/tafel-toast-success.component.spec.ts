import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TafelToastSuccessComponent} from './tafel-toast-success.component';
import {By} from '@angular/platform-browser';
import {ToastModule} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('TafelToastSuccessComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ToastModule,
        NoopAnimationsModule
      ],
      declarations: [
        TafelToastSuccessComponent
      ],
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastSuccessComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

  it('should render title and message', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastSuccessComponent);
    const component = fixture.componentInstance;

    const title = 'test-title';
    const message = 'test-message';
    component.title = title;
    component.message = message;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(`[testid="title"]`)).nativeElement.textContent).toBe(title);
    expect(fixture.debugElement.query(By.css(`[testid="message"]`)).nativeElement.textContent).toBe(message);
  }));

});
