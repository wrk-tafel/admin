import { TestBed } from '@angular/core/testing';
import { SelectSheltersComponent } from './select-shelters.component';
import { CardModule, ColComponent, ModalModule, ProgressModule, RowComponent } from '@coreui/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ShelterItem } from '../../../../api/shelter-api.service';

describe('SelectSheltersComponent', () => {
    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ModalModule,
                CardModule,
                RowComponent,
                ColComponent,
                ProgressModule
            ]
        }).compileComponents();
    }));

    const testShelters: ShelterItem[] = [
        {
            id: 1,
            name: 'Test Shelter 1',
            addressStreet: 'Test Street',
            addressHouseNumber: '1',
            addressStairway: 'A',
            addressDoor: 'B',
            addressPostalCode: 12345,
            addressCity: 'Test City',
            note: 'Test Note',
            personsCount: 100
        },
        {
            id: 2,
            name: 'Test Shelter 2',
            addressStreet: 'Test Street',
            addressHouseNumber: '1',
            addressStairway: 'A',
            addressDoor: 'B',
            addressPostalCode: 12345,
            addressCity: 'Test City',
            note: 'Test Note 2',
            personsCount: 200
        }
    ];

    it('component can be created', () => {
        const fixture = TestBed.createComponent(SelectSheltersComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('newly selected shelter is emitted to output', () => {
        const fixture = TestBed.createComponent(SelectSheltersComponent);
        const componentRef = fixture.componentRef;
        const component = fixture.componentInstance;
        vi.spyOn(component.updateSelectedShelters, 'emit');

        componentRef.setInput('sheltersList', testShelters);
        componentRef.setInput('initialSelectedShelters', [testShelters[1]]);
        fixture.detectChanges();

        expect(component.selectedShelters.at(1).value).toBe(true);

        component.selectedShelters.at(0).setValue(true);

        component.saveShelterSelection();

        expect(component.updateSelectedShelters.emit).toHaveBeenCalledWith(testShelters);
    });

    it('cancel modal', () => {
        const fixture = TestBed.createComponent(SelectSheltersComponent);
        const component = fixture.componentInstance;
        component.showSelectSheltersModal = true;

        expect(component.showSelectSheltersModal).toBe(true);

        component.cancelModal();

        expect(component.showSelectSheltersModal).toBe(false);
    });

    it('format street', () => {
        const fixture = TestBed.createComponent(SelectSheltersComponent);
        const component = fixture.componentInstance;

        const address = component.formatStreet(testShelters[0]);

        expect(address).toBe('Test Street 1, Stiege A, Top B');
    });

});
