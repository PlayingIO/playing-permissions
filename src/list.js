import R from 'ramda';

/**
 * Group by multiple
 *
 * usage: groupByMultiple([R.prop('a'), R.prop('b'), R.prop('c')], data)
 */
export const groupByMultiple = R.curry((fields, data) => {
  if (fields.length === 1) return R.groupBy(fields[0], data);
  let groupBy = R.groupBy(R.last(fields));
  R.times(() => {
    groupBy = R.mapObjIndexed(groupBy)
  }, fields.length - 1);

  return groupBy(groupByMultiple(R.init(fields), data))
});

/**
 * Do any item in a list appear in another list?
 *
 * usage: overlaps(['-v', '--verbose'], ['node', 'script.js', '-v']) // true
 *
 * @sig: :: [a] -> [a] -> Boolean
 */
export const isIntersect = R.pipe(R.intersection, R.complement(R.isEmpty));

/**
 * Create a list function
 *
 * usage: list(1, 2, 3); // => [1, 2, 3]
 *
 * @sig: :: a... -> [a...]
 */
export const list = R.unapply(R.identity);

/**
 * map with (val, index, obj) callback
 */
export const mapIndexed = R.addIndex(R.map);

/**
 * Pick values a from list by indexes
 *
 * usage: pickIndexes([0, 2], ['a', 'b', 'c']); // => ['a', 'c']
 *
 * @sig: :: [Number] -> [a] -> [a]
 */
export const pickIndexes = R.compose(R.values, R.pickAll);

/**
 * Pivot a table with a function to resolve conflicts (multiple values
 * for the same attribute)
 *
 * usage:
 *   pivotWith(R.min, "attribute", "value", [
 *     { key: "key1", attribute: "attribute1" , value: 1 },
 *     { key: "key1", attribute: "attribute3" , value: 3 },
 *     { key: "key2" , attribute: "attribute1" , value: 2 },
 *     { key: "key2", attribute: "attribute1", value: 8 },
 *     { key: "key2", attribute: "attribute2", value: 4 },
 *   ])
 *   result:
 *   [{ key: key1, attribute1: 1, attribute3: 3 },
 *    { key: key2, attribute1: 2, attribute2: 4 }]
 */
export const pivotWith = R.curry((fn, keyCol, valCol, table) => R.pipe(
  R.groupWith(R.eqBy(R.omit([keyCol, valCol]))),
  R.map((rowGroup) => R.reduce(
    R.mergeWith(fn),
    R.omit([keyCol, valCol], rowGroup[0]),
    rowGroup.map((row) => ({ [row[keyCol]]: row[valCol] }))
  )),
)(table));

/**
 * Pivot a table
 *
 * usage:
 *   pivot("attribute", "value", [
 *     { key: "key1", attribute: "attribute1", value: 1 },
 *     { key: "key1", attribute: "attribute3", value: 3 },
 *     { key: "key2", attribute: "attribute1", value: 2 },
 *     { key: "key2", attribute: "attribute2", value: 4 },
 *   ])
 *   result:
 *   [{ key: key1, attribute1: 1, attribute3: 3 },
 *    { key: key2, attribute1: 2, attribute2: 4 }]
 */
export const pivot = exports.pivotWith(R.nthArg(0));

/**
 * Unpivot a table
 *
 * usage:
 *   unpivot([ "attribute1", "attribute2", "attribute3" ], "attribute", "value",
 *     [{ key: "key1", attribute1: 1, attribute2: null, attribute3: 3 }])
 *   result:
 *   [{ attribute: attribute1, value: 1, key: key1 },
 *    { attribute: attribute3, value: 3, key: key1 }]
 */
export const unpivot = R.curry((cols, attrCol, valCol, table) => R.chain((row) => R.pipe(
  R.pick(cols),
  R.filter(R.complement(R.isNil)),
  R.mapObjIndexed((v, k) => Object.assign({ [attrCol]: k, [valCol]: v }, R.omit(cols, row))),
  R.values,
)(row), table));

/**
 * Unpivot any other columns in a table
 *
 * usage: unpivotRest([ "key" ], "attribute", "value",
 *     [{ key: "key1", attribute1: 1, attribute2: null, attribute3: 3 }])
 *   result:
 *   [{ attribute: attribute1, value: 1, key: key1 },
 *    { attribute: attribute3, value: 3, key: key1 }]
 */
export const unpivotRest = R.curry((cols, attrCol, valCol, table) => R.chain((row) => R.pipe(
  R.omit(cols),
  R.filter(R.complement(R.isNil)),
  R.mapObjIndexed((v, k) => Object.assign({ [attrCol]: k, [valCol]: v }, R.pick(cols, row))),
  R.values,
)(row), table));

/**
 * Separate a list into n parts
 *
 * usage: separate(2, ['a','b','c','d','e'])
 * // -> [['a','b','c'],['d','e']]
 */
export const separate = R.curry((n, list) => {
  var len = list.length;
  var idxs = R.range(0, len);
  var f = (_v, idx) => Math.floor(idx * n / len);
  return R.values(R.addIndex(R.groupBy)(f, list));
});

/**
 * Separate a list into n parts based on a comparator
 */
export const separateBy = R.curry((comparator, n, coll) => {
  let sorted = R.sortBy(comparator, coll);
  return exports.separate(n, sorted);
});

/*
 * Sort a List by array of props (if first prop equivalent, sort by second, etc.)
 *
 * usage: sortByProps(["a","b","c"], [{a:1,b:2,c:3}, {a:10,b:10,c:10}, {a:10,b:6,c:0}, {a:1, b:2, c:1}, {a:100}])
 * //=> [{a:100}, {a:10,b:10,c:10}, {a:10,b:6,c:0}, {a:1,b:2,c:3}, {a:1, b:2, c:1}]
 */
const variadicEither = (head, ...tail) =>
  R.reduce(R.either, head, tail);
const makeComparator = (prop) =>
  R.comparator((a,b) =>
    R.gt(R.prop(prop, a), R.prop(prop, b)));
export const sortByProps = (props, list) =>
  R.sort(variadicEither(...R.map(makeComparator, props)), list);


/**
 * Gets elements that are unique throughout a given group of arrays.
 *
 * @param {any[][]} a - A group of arrays to get unique elements from.
 * @return {any[]} An array of unique elements.
 */
export const uniquesFor = (...a) => [...new Set([].concat(...a))];
