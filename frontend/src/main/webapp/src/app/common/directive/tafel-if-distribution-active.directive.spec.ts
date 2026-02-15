import { TafelIfDistributionActiveDirective } from './tafel-if-distribution-active.directive';
import { DistributionItem } from '../../api/distribution-api.service';
import { TestBed } from '@angular/core/testing';
import { GlobalStateService } from '../state/global-state.service';
import { signal } from '@angular/core';
import { Component, TemplateRef, ViewContainerRef } from '@angular/core';

@Component({
    template: '<div *tafelIfDistributionActive>Content</div>',
    imports: [TafelIfDistributionActiveDirective]
})
class TestComponent {}

describe('TafelIfDistributionActiveDirective', () => {

    function setup(distributionItem: DistributionItem | null) {
        const globalStateServiceSpy = {
            getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution")
        };
        globalStateServiceSpy.getCurrentDistribution.mockReturnValue(signal(distributionItem).asReadonly());

        TestBed.configureTestingModule({
            providers: [
                { provide: GlobalStateService, useValue: globalStateServiceSpy }
            ]
        });

        const fixture = TestBed.createComponent(TestComponent);
        return { fixture, globalStateServiceSpy };
    }

    it('should render when distribution is active', () => {
        const mockDistributionItem: DistributionItem = { id: 123, startedAt: new Date() };
        const { fixture } = setup(mockDistributionItem);

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Content');
    });

    it('should not render when distribution is inactive', () => {
        const { fixture } = setup(null);

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('Content');
    });

});
