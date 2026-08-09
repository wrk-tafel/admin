import {TestBed} from '@angular/core/testing';
import {ClientLogService} from './client-log.service';

describe('ClientLogService', () => {
  let service: ClientLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [ClientLogService]});
    service = TestBed.inject(ClientLogService);
  });

  it('starts empty', () => {
    expect(service.getEntries()).toEqual([]);
  });

  it('records a message with a timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T09:15:30.000Z'));

    service.record('HTTP 500 - GET /api/households');

    expect(service.getEntries()).toEqual([
      {timestamp: '2026-03-22T09:15:30.000Z', message: 'HTTP 500 - GET /api/households'}
    ]);

    vi.useRealTimers();
  });

  it('keeps only the 20 most recent entries', () => {
    for (let i = 1; i <= 25; i++) {
      service.record(`error ${i}`);
    }

    const entries = service.getEntries();
    expect(entries).toHaveLength(20);
    expect(entries[0].message).toBe('error 6');
    expect(entries[19].message).toBe('error 25');
  });

  it('truncates an oversized message so the request stays acceptable to the backend', () => {
    service.record('x'.repeat(1500));

    expect(service.getEntries()[0].message).toHaveLength(1000);
  });

  it('hands out a copy so a caller cannot change the log', () => {
    service.record('error');

    service.getEntries().push({timestamp: 'now', message: 'injected'});

    expect(service.getEntries()).toHaveLength(1);
  });

});
