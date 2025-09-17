import {TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TafelToastComponent} from './tafel-toast.component';
import {By} from '@angular/platform-browser';
import {BgColorDirective, ProgressModule, ToastModule} from '@coreui/angular';
import {provideZonelessChangeDetection} from "@angular/core";
import {provideNoopAnimations} from "@angular/platform-browser/animations";

describe('TafelToastComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ToastModule,
        BgColorDirective,
        ProgressModule
      ],
      providers: [
        provideNoopAnimations(),
        provideZonelessChangeDetection(),
      ]
    }).compileComponents();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render prefix, title and message', async () => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const titlePrefix = 'test-prefix';
    const title = 'test-title';
    const message = 'test-message';
    component.titlePrefix = titlePrefix;
    component.title = title;
    component.message = message;
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css(`[testid="title"]`)).nativeElement.textContent).toBe(`${titlePrefix} ${title}`);
    expect(fixture.debugElement.query(By.css(`[testid="message"]`)).nativeElement.textContent.trim()).toBe(message);
  });

  it('should render without prefix', async () => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const title = 'test-title';
    const message = 'test-message';
    component.title = title;
    component.message = message;
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css(`[testid="title"]`)).nativeElement.textContent).toBe(title);
    expect(fixture.debugElement.query(By.css(`[testid="message"]`)).nativeElement.textContent.trim()).toBe(message);
  });

  it('should render with correct background color', async () => {
    const fixture = TestBed.createComponent(TafelToastComponent);
    const component = fixture.componentInstance;

    const bgColor = 'bgcolor-test';
    component.bgColor = bgColor;
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css(`[testid="tafel-toast-header"]`)).nativeElement.getAttribute('class')).toContain(bgColor);
  });

});
