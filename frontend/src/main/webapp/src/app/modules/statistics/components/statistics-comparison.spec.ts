import dayjs from 'dayjs';
import {computeDelta, previousDateRange} from './statistics-comparison';
import {StatisticsDetailData, StatisticsDistribution} from '../../../api/statistics-api.service';

function detail(value: number): StatisticsDetailData {
  return {title: `${value}`, subTitle: 'Test', value: value, labels: [], dataPoints: []};
}

describe('statistics comparison', () => {

  describe('computeDelta', () => {

    it('is absent without a comparison', () => {
      expect(computeDelta(detail(10), undefined)).toBeUndefined();
      expect(computeDelta(undefined, detail(10))).toBeUndefined();
    });

    it('reports an increase as difference and percentage', () => {
      expect(computeDelta(detail(112), detail(100))).toEqual({
        difference: 12,
        percentage: 12,
        direction: 'up'
      });
    });

    it('reports a decrease as difference and percentage', () => {
      expect(computeDelta(detail(75), detail(100))).toEqual({
        difference: -25,
        percentage: -25,
        direction: 'down'
      });
    });

    it('reports an unchanged value as flat', () => {
      expect(computeDelta(detail(100), detail(100))).toEqual({
        difference: 0,
        percentage: 0,
        direction: 'flat'
      });
    });

    it('leaves the percentage out when the previous period was zero', () => {
      const delta = computeDelta(detail(3), detail(0));

      expect(delta?.percentage).toBeUndefined();
      expect(delta?.difference).toEqual(3);
      expect(delta?.direction).toEqual('up');
    });

  });

  describe('previousDateRange', () => {

    it('shifts a year back by a year', () => {
      const previous = previousDateRange('year', {
        from: new Date('2026-01-01'),
        to: new Date('2026-08-12')
      });

      expect(dayjs(previous!.from).format('YYYY-MM-DD')).toEqual('2025-01-01');
      expect(dayjs(previous!.to).format('YYYY-MM-DD')).toEqual('2025-08-12');
    });

    it('shifts the previous year back by another year', () => {
      const previous = previousDateRange('previousYear', {
        from: new Date('2025-01-01'),
        to: new Date('2025-12-31')
      });

      expect(dayjs(previous!.from).format('YYYY-MM-DD')).toEqual('2024-01-01');
      expect(dayjs(previous!.to).format('YYYY-MM-DD')).toEqual('2024-12-31');
    });

    it('shifts the running month into the month before, clamping an overflowing day', () => {
      const previous = previousDateRange('currentMonth', {
        from: new Date('2024-03-01'),
        to: new Date('2024-03-31')
      });

      expect(dayjs(previous!.from).format('YYYY-MM-DD')).toEqual('2024-02-01');
      expect(dayjs(previous!.to).format('YYYY-MM-DD')).toEqual('2024-02-29');
    });

    it('compares a distribution with the one recorded before it', () => {
      const distributions = [
        {startDate: new Date('2026-08-08T10:00:00'), endDate: new Date('2026-08-08T18:00:00')},
        {startDate: new Date('2026-08-01T10:00:00'), endDate: new Date('2026-08-01T18:00:00')}
      ] as unknown as StatisticsDistribution[];

      const previous = previousDateRange(
        'distribution',
        {from: new Date('2026-08-08T10:00:00'), to: new Date('2026-08-08T18:00:00')},
        distributions,
        distributions[0]
      );

      expect(dayjs(previous!.from).format('YYYY-MM-DD')).toEqual('2026-08-01');
    });

    it('has no comparison for the oldest distribution', () => {
      const distributions = [
        {startDate: new Date('2026-08-08T10:00:00'), endDate: new Date('2026-08-08T18:00:00')}
      ] as unknown as StatisticsDistribution[];

      expect(previousDateRange(
        'distribution',
        {from: new Date('2026-08-08T10:00:00'), to: new Date('2026-08-08T18:00:00')},
        distributions,
        distributions[0]
      )).toBeUndefined();
    });

    it('has no comparison while no distribution is selected', () => {
      expect(previousDateRange('distribution', {from: new Date(), to: new Date()}, [])).toBeUndefined();
    });

    it('puts the same number of days directly in front of a custom range', () => {
      const previous = previousDateRange('custom', {
        from: new Date('2024-04-01'),
        to: new Date('2024-04-30')
      });

      expect(dayjs(previous!.from).format('YYYY-MM-DD')).toEqual('2024-03-02');
      expect(dayjs(previous!.to).format('YYYY-MM-DD')).toEqual('2024-03-31');
    });

  });

});
