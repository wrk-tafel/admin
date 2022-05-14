import { TestBed, waitForAsync } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { CustomerApiService } from "../api/customer-api.service";
import { CustomerSearchComponent } from "./customer-search.component";

describe('CustomerSearchComponent', () => {
    let apiService: jasmine.SpyObj<CustomerApiService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(waitForAsync(() => {
        const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['']);

        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                ReactiveFormsModule
            ],
            declarations: [
                CustomerSearchComponent,
            ],
            providers: [
                {
                    provide: CustomerApiService,
                    useValue: apiServiceSpy
                },
                {
                    provide: Router,
                    useValue: jasmine.createSpyObj('Router', ['navigate'])
                }
            ]
        }).compileComponents();

        apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

});
