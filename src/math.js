import R from 'ramda';

/**
 * Create an incrementing or decrementing range of numbers with a step
 *
 * usage: rangeStep(2, 2, 8);   // [2, 4, 6, 8]
 */
export const rangeStep = (start, step, stop) => R.map(
  n => start + step * n,
  R.range(0, (1 + (stop - start) / step) >>> 0)
);