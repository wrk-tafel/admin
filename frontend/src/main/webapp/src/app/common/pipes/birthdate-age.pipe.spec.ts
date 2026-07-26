import {BirthdateAgePipe} from './birthdate-age.pipe';
import dayjs from 'dayjs';

describe('BirthdateAgePipe', () => {
  let pipe: BirthdateAgePipe;

  beforeEach(() => {
    pipe = new BirthdateAgePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format birthdate with correct age for 25 years old', () => {
    const birthDate = dayjs().subtract(25, 'years').toDate();
    const result = pipe.transform(birthDate);

    const expectedDate = dayjs(birthDate).format('DD.MM.YYYY');
    expect(result).toBe(`${expectedDate} (25)`);
  });

  it('should format birthdate with correct age for 30 years old', () => {
    const birthDate = dayjs().subtract(30, 'years').toDate();
    const result = pipe.transform(birthDate);

    const expectedDate = dayjs(birthDate).format('DD.MM.YYYY');
    expect(result).toBe(`${expectedDate} (30)`);
  });

  it('should format birthdate with correct age for 0 years old (infant)', () => {
    const birthDate = dayjs().subtract(6, 'months').toDate();
    const result = pipe.transform(birthDate);

    const expectedDate = dayjs(birthDate).format('DD.MM.YYYY');
    expect(result).toBe(`${expectedDate} (0)`);
  });

  it('should format birthdate with correct age for 1 year old', () => {
    const birthDate = dayjs().subtract(1, 'years').subtract(1, 'days').toDate();
    const result = pipe.transform(birthDate);

    const expectedDate = dayjs(birthDate).format('DD.MM.YYYY');
    expect(result).toBe(`${expectedDate} (1)`);
  });

  it('should format birthdate with correct age for 65 years old', () => {
    const birthDate = dayjs().subtract(65, 'years').toDate();
    const result = pipe.transform(birthDate);

    const expectedDate = dayjs(birthDate).format('DD.MM.YYYY');
    expect(result).toBe(`${expectedDate} (65)`);
  });

  it('should return dash for undefined birthdate', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('-');
  });

  it('should return dash for null birthdate', () => {
    const result = pipe.transform(null);

    expect(result).toBe('-');
  });

  it('should format specific date correctly', () => {
    const birthDate = new Date('1990-06-15');
    const result = pipe.transform(birthDate);

    const age = dayjs().diff(birthDate, 'years');
    expect(result).toBe(`15.06.1990 (${age})`);
  });
});
