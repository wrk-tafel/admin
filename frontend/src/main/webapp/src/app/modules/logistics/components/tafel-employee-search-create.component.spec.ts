import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeApiService, EmployeeData, EmployeeListResponse } from '../../../api/employee-api.service';
import { TafelEmployeeSearchCreateComponent } from './tafel-employee-search-create.component';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TafelEmployeeSearchCreate', () => {
    let employeeApiService: MockedObject<EmployeeApiService>;
    let matDialog: MockedObject<MatDialog>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: EmployeeApiService,
                    useValue: {
                        findEmployees: vi.fn().mockName("EmployeeApiService.findEmployees"),
                        saveEmployee: vi.fn().mockName("EmployeeApiService.saveEmployee")
                    }
                },
                {
                    provide: MatDialog,
                    useValue: {
                        open: vi.fn().mockName("MatDialog.open")
                    }
                }
            ]
        }).compileComponents();

        employeeApiService = TestBed.inject(EmployeeApiService) as MockedObject<EmployeeApiService>;
        matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    }));

    const mockEmployeeResponse: EmployeeListResponse = {
        items: [
            { id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1' },
            { id: 2, personnelNumber: '00002', firstname: 'first 2', lastname: 'last 2' },
        ],
        totalPages: 1,
        totalCount: 2,
        pageSize: 1,
        currentPage: 1
    };

    it('component can be created', () => {
        const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('single employee found', () => {
        const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        const personnelNumber = '00001';
        componentRef.setInput('searchInput', personnelNumber);

        const mockResponse = {
            ...mockEmployeeResponse,
            items: [mockEmployeeResponse.items[0]]
        };
        employeeApiService.findEmployees.mockReturnValueOnce(of(mockResponse));

        let emittedEmployee: EmployeeData;
        component.selectedEmployee.subscribe((employee) => {
            emittedEmployee = employee;
        });

        component.triggerSearch();

        expect(emittedEmployee).toEqual(mockEmployeeResponse.items[0]);
    });

    it('multiple employees found - opens select employee dialog', () => {
        const mockEmployee: EmployeeData = { id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1' };
        matDialog.open.mockReturnValue({ afterClosed: () => of(mockEmployee) } as any);

        const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        const personnelNumber = '00001';
        componentRef.setInput('searchInput', personnelNumber);

        employeeApiService.findEmployees.mockReturnValueOnce(of(mockEmployeeResponse));

        let emittedEmployee: EmployeeData;
        component.selectedEmployee.subscribe((employee) => {
            emittedEmployee = employee;
        });

        component.triggerSearch();

        expect(matDialog.open).toHaveBeenCalled();
        expect(emittedEmployee).toEqual(mockEmployee);
    });

    it('employee not found - opens create employee dialog', () => {
        const mockEmployee: EmployeeData = { id: 1, personnelNumber: '00001', firstname: 'first 1', lastname: 'last 1' };
        matDialog.open.mockReturnValue({ afterClosed: () => of(mockEmployee) } as any);

        const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        const personnelNumber = '00001';
        componentRef.setInput('searchInput', personnelNumber);

        const emptyResponse: EmployeeListResponse = {
            items: [],
            currentPage: 1,
            pageSize: 1,
            totalCount: 1,
            totalPages: 1
        };
        employeeApiService.findEmployees.mockReturnValueOnce(of(emptyResponse));

        let emittedEmployee: EmployeeData;
        component.selectedEmployee.subscribe((employee) => {
            emittedEmployee = employee;
        });

        component.triggerSearch();

        expect(matDialog.open).toHaveBeenCalled();
        expect(emittedEmployee).toEqual(mockEmployee);
    });

    it('employee not found - dialog dismissed without creating', () => {
        matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) } as any);

        const fixture = TestBed.createComponent(TafelEmployeeSearchCreateComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        const personnelNumber = '00001';
        componentRef.setInput('searchInput', personnelNumber);

        const emptyResponse: EmployeeListResponse = {
            items: [],
            currentPage: 1,
            pageSize: 1,
            totalCount: 1,
            totalPages: 1
        };
        employeeApiService.findEmployees.mockReturnValueOnce(of(emptyResponse));

        let emitted = false;
        component.selectedEmployee.subscribe(() => {
            emitted = true;
        });

        component.triggerSearch();

        expect(matDialog.open).toHaveBeenCalled();
        expect(emitted).toBe(false);
    });

});
