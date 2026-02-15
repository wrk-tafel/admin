import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TafelIfPermissionDirective } from './tafel-if-permission.directive';
import { AuthenticationService } from './authentication.service';

@Component({
    selector: 'test-component',
    template: `<div *tafelIfPermission="permission">Content</div>`,
    standalone: true,
    imports: [TafelIfPermissionDirective]
})
class TestComponent {
    permission = 'PERM1';
}

describe('TafelIfPermissionDirective', () => {
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;
    let authServiceSpy: any;

    beforeEach(() => {
        authServiceSpy = {
            hasPermission: vi.fn().mockName("AuthenticationService.hasPermission")
        };

        TestBed.configureTestingModule({
            imports: [TestComponent],
            providers: [
                { provide: AuthenticationService, useValue: authServiceSpy }
            ]
        });

        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
    });

    it('should render when permission is given', () => {
        authServiceSpy.hasPermission.mockReturnValue(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Content');
    });

    it('should not render when permission is missing', () => {
        authServiceSpy.hasPermission.mockReturnValue(false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('Content');
    });

});
