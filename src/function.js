import R from 'ramda';

/*
 * Apply a given function N times
 *
 * usage: applyN(x => x * x, 4)(2); //=> 65536 (2 -> 4 -> 16 -> 256 -> 65536)
 */
export const applyN = R.compose(R.reduceRight(R.compose, R.identity), R.repeat);

/*
 * Apply function over the value at the end of a path
 *
 * usage: mapPath(['a', 'b', 'c'], R.inc, {a: {b: {c: 3}}});
 *   //=> { a: { b: { c: 4 } } }
 * @sig: :: [String] -> (a -> b) -> {k: a} -> {k: b}
 */
export const applyPath = R.curry((path, fn, obj) =>
  R.assocPath(path, fn(R.path(path, obj)), obj)
);

