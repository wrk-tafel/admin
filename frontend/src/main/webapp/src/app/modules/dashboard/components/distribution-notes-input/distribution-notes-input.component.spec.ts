import {TestBed, waitForAsync} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionNotesInputComponent} from './distribution-notes-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {of, throwError} from 'rxjs';

describe('DistributionNotesInputComponent', () => {
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

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
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['saveNotes'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

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

  it('save data failed', () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    distributionApiService.saveNotes.and.returnValue(throwError(() => {
        return {status: 500};
      })
    );
    const testNotes = 'test-notes';
    componentRef.setInput('initialNotesData', testNotes);
    fixture.detectChanges();

    component.save();

    expect(distributionApiService.saveNotes).toHaveBeenCalledWith(testNotes);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
  });

});
