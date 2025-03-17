import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TafelToastComponent} from './tafel-toast.component';
import {By} from '@angular/platform-browser';
import {BgColorDirective, ProgressModule, ToastModule} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('TafelToastComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ToastModule,
        BgColorDirective,
        NoopAnimationsModule,
        ProgressModule
      ],
    }).compileComponents();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

  it('should render prefix, title and message', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const titlePrefix = 'test-prefix';
    const title = 'test-title';
    const message = 'test-message';
    component.titlePrefix = titlePrefix;
    component.title = title;
    component.message = message;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(`[testid="title"]`)).nativeElement.textContent).toBe(`${titlePrefix} ${title}`);
    expect(fixture.debugElement.query(By.css(`[testid="message"]`)).nativeElement.textContent.trim()).toBe(message);
  }));

  it('should render without prefix', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const title = 'test-title';
    const message = 'test-message';
    component.title = title;
    component.message = message;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(`[testid="title"]`)).nativeElement.textContent).toBe(title);
    expect(fixture.debugElement.query(By.css(`[testid="message"]`)).nativeElement.textContent.trim()).toBe(message);
  }));

  it('should render with correct background color', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const bgColor = 'bgcolor-test';
    component.bgColor = bgColor;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(`[testid="tafel-toast-header"]`)).nativeElement.getAttribute('class')).toContain(bgColor);
  }));

});
