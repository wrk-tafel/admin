import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import {Component} from '@angular/core';
import {TafelDialogComponent} from './tafel-dialog.component';

@Component({
    selector: 'tafel-test-host-info',
    template: `<tafel-dialog type="info" title="Info Dialog">
        <div tafel-dialog-content><span id="projected-content">Hello World</span></div>
        <div tafel-dialog-actions><button id="action-btn">Click</button></div>
    </tafel-dialog>`,
    imports: [TafelDialogComponent],
})
class TestHostInfoComponent {}

@Component({
    selector: 'tafel-test-host-warning',
    template: `<tafel-dialog type="warning" title="Warning Dialog">
        <div tafel-dialog-content><span>Warning content</span></div>
        <div tafel-dialog-actions><button>OK</button></div>
    </tafel-dialog>`,
    imports: [TafelDialogComponent],
})
class TestHostWarningComponent {}

@Component({
    selector: 'tafel-test-host-danger',
    template: `<tafel-dialog type="danger" title="Danger Dialog">
        <div tafel-dialog-content><span>Danger content</span></div>
        <div tafel-dialog-actions><button>Delete</button></div>
    </tafel-dialog>`,
    imports: [TafelDialogComponent],
})
class TestHostDangerComponent {}

@Component({
    selector: 'tafel-test-host-success',
    template: `<tafel-dialog type="success" title="Success Dialog">
        <div tafel-dialog-content><span>Success content</span></div>
        <div tafel-dialog-actions><button>Save</button></div>
    </tafel-dialog>`,
    imports: [TafelDialogComponent],
})
class TestHostSuccessComponent {}

describe('TafelDialogComponent', () => {
    describe('default type (info)', () => {
        let fixture: ComponentFixture<TestHostInfoComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [TafelDialogComponent, MatDialogModule, TestHostInfoComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(TestHostInfoComponent);
            fixture.detectChanges();
        });

        it('renders the title in the dialog header', () => {
            const title = fixture.debugElement.query(By.css('h4[mat-dialog-title]'));
            expect(title).toBeTruthy();
            expect(title.nativeElement.textContent).toBe('Info Dialog');
        });

        it('applies the dialog-header-info class', () => {
            const header = fixture.debugElement.query(By.css('.dialog-header-info'));
            expect(header).toBeTruthy();
        });

        it('projects content into mat-dialog-content', () => {
            const content = fixture.debugElement.query(By.css('#projected-content'));
            expect(content).toBeTruthy();
            expect(content.nativeElement.textContent).toBe('Hello World');
        });

        it('projects content into mat-dialog-actions', () => {
            const actions = fixture.debugElement.query(By.css('mat-dialog-actions'));
            expect(actions).toBeTruthy();
            expect(actions.nativeElement.querySelector('#action-btn')).toBeTruthy();
        });
    });

    describe('type=warning', () => {
        let fixture: ComponentFixture<TestHostWarningComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [TafelDialogComponent, MatDialogModule, TestHostWarningComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(TestHostWarningComponent);
            fixture.detectChanges();
        });

        it('applies the dialog-header-warning class', () => {
            const header = fixture.debugElement.query(By.css('.dialog-header-warning'));
            expect(header).toBeTruthy();
            const headerTitle = fixture.debugElement.query(By.css('.dialog-header-warning h4'));
            expect(headerTitle.nativeElement.textContent).toBe('Warning Dialog');
        });
    });

    describe('type=danger', () => {
        let fixture: ComponentFixture<TestHostDangerComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [TafelDialogComponent, MatDialogModule, TestHostDangerComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(TestHostDangerComponent);
            fixture.detectChanges();
        });

        it('applies the dialog-header-danger class', () => {
            const header = fixture.debugElement.query(By.css('.dialog-header-danger'));
            expect(header).toBeTruthy();
        });
    });

    describe('type=success', () => {
        let fixture: ComponentFixture<TestHostSuccessComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [TafelDialogComponent, MatDialogModule, TestHostSuccessComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(TestHostSuccessComponent);
            fixture.detectChanges();
        });

        it('applies the dialog-header-success class', () => {
            const header = fixture.debugElement.query(By.css('.dialog-header-success'));
            expect(header).toBeTruthy();
        });
    });
});
