import {TestBed, waitForAsync} from '@angular/core/testing';
import {SelectSheltersComponent} from './select-shelters.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ShelterApiService} from "../../../../api/shelter-api.service";

describe('SelectSheltersComponent', () => {
  let shelterApiService: jasmine.SpyObj<ShelterApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ModalModule,
        CardModule,
        RowComponent,
        ColComponent,
        ProgressModule
      ],
      providers: [
        {
          provide: ShelterApiService,
          useValue: jasmine.createSpyObj('ShelterApiService', ['getShelters'])
        }
      ]
    }).compileComponents();

    shelterApiService = TestBed.inject(ShelterApiService) as jasmine.SpyObj<ShelterApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('TODO', () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const component = fixture.componentInstance;

    expect(false).toBeTruthy();
  });

});
