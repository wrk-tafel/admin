import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {DistributionNotesInputComponent} from './distribution-notes-input.component';
import {CardModule, ColComponent, ModalModule, ProgressModule, RowComponent} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import {of, throwError} from 'rxjs';

describe('DistributionNotesInputComponent', () => {
  let distributionApiService: MockedObject<DistributionApiService>;
  let toastr: MockedObject<ToastrService>;

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
          provide: ToastrService,
          useValue: {
            success: vi.fn().mockName('ToastrService.success'),
            error: vi.fn().mockName('ToastrService.error')
          }
        }
      ]
    }).compileComponents();

    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
    toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
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
    expect(toastr.success).toHaveBeenCalledWith('Anmerkungen gespeichert!');
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
    expect(toastr.error).toHaveBeenCalledWith('Speichern fehlgeschlagen!');
  });

});
