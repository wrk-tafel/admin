import { TestBed, waitForAsync } from "@angular/core/testing";
import { CustomerSearchComponent } from "./customer-search.component";

describe('CustomerSearchComponent', () => {

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: []
        }).compileComponents();
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

});
