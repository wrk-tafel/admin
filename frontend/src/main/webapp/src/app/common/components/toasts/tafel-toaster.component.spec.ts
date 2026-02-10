import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { TafelToasterComponent } from './tafel-toaster.component';
import { CommonModule } from '@angular/common';
import { ToastModule } from '@coreui/angular';
import { ToastOptions, ToastService, ToastType } from './toast.service';
import { Subject } from 'rxjs';
import { TafelToastComponent } from './toast/tafel-toast.component';

describe('TafelToasterComponent', () => {
    let toastServiceSpy: MockedObject<ToastService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                ToastModule
            ],
            providers: [
                {
                    provide: ToastService,
                    useValue: {
                        showToast: vi.fn().mockName("ToastService.showToast")
                    }
                }
            ]
        }).compileComponents();

        toastServiceSpy = TestBed.inject(ToastService) as MockedObject<ToastService>;
        toastServiceSpy.addToastSubject = new Subject<ToastOptions>();
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(TafelToasterComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('subject delegates correctly to service', () => {
        const fixture = TestBed.createComponent(TafelToasterComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const toasterComponent = {
            addToast: vi.fn().mockName("Toaster.addToast")
        };
        component.toaster = toasterComponent as any;

        const subject: Subject<ToastOptions> = new Subject();
        component.subscribeToastSubject(subject);

        const toastOptions: ToastOptions = { type: ToastType.ERROR, title: 'test-title', message: 'test-message' };
        subject.next(toastOptions);

        const toastProps = {
            titlePrefix: 'Fehler:',
            title: 'test-title',
            message: 'test-message',
            headerTextColor: 'white',
            bgColor: 'danger',
            autohide: true,
            delay: 5000,
            fade: true
        };
        expect(component.toaster.addToast).toHaveBeenCalledWith(TafelToastComponent, toastProps);
    });

});
