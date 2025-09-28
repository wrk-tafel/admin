import {TestBed} from '@angular/core/testing';
import {SelectSheltersComponent} from './select-shelters.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {provideZonelessChangeDetection} from "@angular/core";
import {provideNoopAnimations} from "@angular/platform-browser/animations";

describe('SelectSheltersComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        CardModule,
        RowComponent,
        ColComponent,
        ProgressModule
      ],
      providers: [
        provideNoopAnimations(),
        provideZonelessChangeDetection(),
      ]
    }).compileComponents();
  });

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

  it('newly selected shelter is emitted to output', async () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    spyOn(component.updateSelectedShelters, 'emit');

    componentRef.setInput('shelters', testShelters);
    component.ngOnInit();
    componentRef.setInput('initialSelectedShelters', [testShelters[1]]);
    await fixture.whenStable();

    expect(component.selectedShelters.at(1).value).toBeTrue();

    component.selectedShelters.at(0).setValue(true);

    component.saveShelterSelection();

    expect(component.updateSelectedShelters.emit).toHaveBeenCalledWith(testShelters);
  });

  it('cancel modal', () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const component = fixture.componentInstance;
    component.showSelectSheltersModal = true;

    expect(component.showSelectSheltersModal).toBeTrue();

    component.cancelModal();

    expect(component.showSelectSheltersModal).toBeFalse();
  });

  it('format street', () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const component = fixture.componentInstance;

    const address = component.formatStreet(testShelters[0]);

    expect(address).toBe('Test Street 1, Stiege A, Top B');
  });

});
