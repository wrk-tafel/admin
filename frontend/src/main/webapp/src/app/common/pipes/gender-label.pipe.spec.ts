import {GenderLabelPipe} from './gender-label.pipe';
import {Gender, GenderLabel} from '../../api/customer-api.service';

describe('GenderLabelPipe', () => {
  let pipe: GenderLabelPipe;

  beforeEach(() => {
    pipe = new GenderLabelPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return label for MALE gender', () => {
    const result = pipe.transform(Gender.MALE);

    expect(result).toBe(GenderLabel[Gender.MALE]);
  });

  it('should return label for FEMALE gender', () => {
    const result = pipe.transform(Gender.FEMALE);

    expect(result).toBe(GenderLabel[Gender.FEMALE]);
  });

  it('should return dash for undefined gender', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('-');
  });

  it('should return dash for null gender', () => {
    const result = pipe.transform(null);

    expect(result).toBe('-');
  });
});
