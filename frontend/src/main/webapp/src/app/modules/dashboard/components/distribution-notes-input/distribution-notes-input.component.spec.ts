import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionNotesInputComponent} from './distribution-notes-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {of, throwError, BehaviorSubject} from 'rxjs';
import {provideZonelessChangeDetection} from "@angular/core";
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';

describe('DistributionNotesInputComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

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
        provideZonelessChangeDetection(),
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['saveNotes'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    
    // Setup mock for GlobalStateService
    const mockDistribution: DistributionItem = {
      id: 123,
      name: 'Test Distribution'
    } as DistributionItem;
    const mockBehaviorSubject = new BehaviorSubject<DistributionItem>(mockDistribution);
    globalStateService.getCurrentDistribution.and.returnValue(mockBehaviorSubject);
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('save data successful', () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveNotes.and.returnValue(of(null));
    const testNotes = ''

    component.notes = testNotes;

    component.save();

    expect(distributionApiService.saveNotes).toHaveBeenCalledWith(testNotes);
    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.SUCCESS,
      title: 'Anmerkungen gespeichert!'
    });
  });

  it('save data failed', async () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    distributionApiService.saveNotes.and.returnValue(throwError(() => {
        return {status: 500};
      })
    );
    const testNotes = 'test-notes';
    componentRef.setInput('initialNotesData', testNotes);
    await fixture.whenStable();

    component.save();

    expect(distributionApiService.saveNotes).toHaveBeenCalledWith(testNotes);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

});
