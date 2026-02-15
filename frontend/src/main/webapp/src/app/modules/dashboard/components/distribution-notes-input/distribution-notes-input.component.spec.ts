import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionNotesInputComponent} from './distribution-notes-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {of, throwError} from 'rxjs';

describe('DistributionNotesInputComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let toastService: MockedObject<ToastService>;

  beforeEach(() => {
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
          useValue: {
            saveNotes: vi.fn().mockName('DistributionApiService.saveNotes')
          }
        },
        {
          provide: ToastService,
          useValue: {
            showToast: vi.fn().mockName('ToastService.showToast')
          }
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('save data successful', () => {
    const fixture = TestBed.createComponent(DistributionNotesInputComponent);
    const component = fixture.componentInstance;
    distributionApiService.saveNotes.mockReturnValue(of(null));
    const testNotes = ''

    component.notes.set(testNotes);

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
    distributionApiService.saveNotes.mockReturnValue(throwError(() => {
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
