import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of, throwError} from 'rxjs';
import {SettingsAnnouncementsComponent} from './settings-announcements.component';
import {AnnouncementResponse, NotificationApiService} from '../../../../api/notification-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsAnnouncementsComponent', () => {
  const announcement: AnnouncementResponse = {
    id: 5,
    title: 'Hinweis',
    message: 'Am Freitag geschlossen',
    createdAt: '2026-09-28T10:00:00',
    expiresAt: '2026-10-05T18:30:00',
    active: true
  };

  let apiMock: Partial<NotificationApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    apiMock = {
      getAnnouncements: vi.fn(() => of({items: [announcement]})),
      createAnnouncement: vi.fn(() => of(announcement)),
      updateAnnouncement: vi.fn(() => of(announcement)),
      deleteAnnouncement: vi.fn(() => of(undefined))
    };
    toastrMock = {success: vi.fn(), error: vi.fn()};

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: NotificationApiService, useValue: apiMock},
        {provide: TafelToastrService, useValue: toastrMock}
      ]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(SettingsAnnouncementsComponent);
    fixture.detectChanges();
    return fixture;
  }

  // the component's form and handlers are protected; the spec drives them the way the template does
  interface Internals {
    controls: { title: { setValue(v: string): void }; message: { setValue(v: string): void } };
    setValue(v: unknown): void;
    getRawValue(): { title: string; message: string; expiresAt: string };
  }

  function form(component: SettingsAnnouncementsComponent) {
    const internals = component as unknown as {
      form: Internals; save(): void; edit(a: AnnouncementResponse): void;
      remove(a: AnnouncementResponse): void; editingId(): number | null;
    };
    return Object.assign(internals.form, {
      save: () => internals.save(),
      edit: (a: AnnouncementResponse) => internals.edit(a),
      remove: (a: AnnouncementResponse) => internals.remove(a),
      editingId: () => internals.editingId()
    });
  }

  it('lists the published announcements', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('[testid="announcement-5"]').textContent).toContain('Hinweis');
    expect(apiMock.getAnnouncements).toHaveBeenCalled();
  });

  it('shows an empty state without announcements', () => {
    apiMock.getAnnouncements = vi.fn(() => of({items: []}));

    const fixture = create();

    expect(fixture.nativeElement.querySelector('[testid="announcements-empty"]')).not.toBeNull();
  });

  it('does not publish without a title and a message', () => {
    const fixture = create();
    const component = form(fixture.componentInstance);
    component.controls.title.setValue('   ');

    component.save();

    expect(apiMock.createAnnouncement).not.toHaveBeenCalled();
  });

  it('publishes a trimmed announcement and reloads the list', () => {
    const fixture = create();
    const component = form(fixture.componentInstance);
    component.controls.title.setValue('  Neu  ');
    component.controls.message.setValue(' Text ');

    component.save();

    expect(apiMock.createAnnouncement).toHaveBeenCalledWith({title: 'Neu', message: 'Text', expiresAt: null});
    expect(toastrMock.success).toHaveBeenCalled();
    expect(apiMock.getAnnouncements).toHaveBeenCalledTimes(2);
  });

  it('sends the expiry as a local datetime', () => {
    const fixture = create();
    const component = form(fixture.componentInstance);
    component.setValue({title: 'T', message: 'M', expiresAt: '2026-10-05T18:30'});

    component.save();

    expect(apiMock.createAnnouncement).toHaveBeenCalledWith({title: 'T', message: 'M', expiresAt: '2026-10-05T18:30:00'});
  });

  it('editing loads the announcement into the form and saves it as an update', () => {
    const fixture = create();
    const component = form(fixture.componentInstance);

    component.edit(announcement);

    expect(component.editingId()).toBe(5);
    expect(component.getRawValue()).toEqual({title: 'Hinweis', message: 'Am Freitag geschlossen', expiresAt: '2026-10-05T18:30'});

    component.save();

    expect(apiMock.updateAnnouncement).toHaveBeenCalledWith(5, {
      title: 'Hinweis', message: 'Am Freitag geschlossen', expiresAt: '2026-10-05T18:30:00'
    });
    expect(component.editingId()).toBeNull();
  });

  it('deletes an announcement and reloads the list', () => {
    const fixture = create();
    const component = form(fixture.componentInstance);

    component.remove(announcement);

    expect(apiMock.deleteAnnouncement).toHaveBeenCalledWith(5);
    expect(apiMock.getAnnouncements).toHaveBeenCalledTimes(2);
  });

  it('reports a failed save', () => {
    apiMock.createAnnouncement = vi.fn(() => throwError(() => ({error: {}, status: 500})));
    const fixture = create();
    const component = form(fixture.componentInstance);
    component.setValue({title: 'T', message: 'M', expiresAt: ''});

    component.save();

    expect(toastrMock.error).toHaveBeenCalled();
  });
});
