import R from 'ramda';

/**
 * merge with clone
 */
export const assign = (...objs) => {
  return R.mergeAll(R.map(R.clone, objs));
};

/**
 * Converts an array of key-value pairs into an object.
 *
 * @param {[string | number, any][]} entries - An array of key-value pairs.
 * @return {Object} An object whose keys are the first elements of the entries
 *     and whose values are the second elements of the entries.
 */
export const arrayAsObject = entries => entries.reduce((o, [k, v]) => (o[k] = v, o), {});

/**
 * Convert object to an array of key-value pairs
 *
 * usage: objArray(["key", "value"], {I: 2, it: 4, that: 1});
 * // [{"key": 2, "value": "I"}, {"key": 4, "value": "it"}, {"key": 1, "value": "that"}]
 *
 * :: {a} -> [{ key :: String, value :: a }]
 */
export const objectAsArray = R.curry((keys, obj) =>
  R.compose(R.map(R.zipObj(keys)), R.toPairs)(obj)
);

/**
 * Difference objects (similar to Guava's Maps.Difference)
 *
 * usage: diffObjs({a: 1, c: 5, d: 4 }, {a: 1, b: 2, d: 7});
 * =>
 *  {
 *    "common": { "a": 1 },
 *    "diff": {
 *      "d": { "left": 4, "right": 7 }
 *    },
 *    "left": { "c": 5 },
 *    "right": { "b": 2 }
 *  }
 */
const groupObjBy = R.curry(R.pipe(
  // Call groupBy with the object as pairs, passing only the value to the key function
  R.useWith(R.groupBy, [R.useWith(R.__, [R.last]), R.toPairs]),
  R.map(R.fromPairs)
));

export const diffObjs = R.pipe(
  R.useWith(R.mergeWith(R.merge), [R.map(R.objOf("left")), R.map(R.objOf("right"))]),
  groupObjBy(R.cond([
    [
      R.both(R.has("left"), R.has("right")),
      R.pipe(R.values, R.ifElse(R.apply(R.equals), R.always("common"), R.always("diff")))
    ],
    [R.has("left"), R.always("onlyOnLeft")],
    [R.has("right"), R.always("onlyOnRight")],
  ])),
  R.evolve({
    common: R.map(R.prop("left")),
    onlyOnLeft: R.map(R.prop("left")),
    onlyOnRight: R.map(R.prop("right"))
  })
);

/**
 * Filter an object using keys as well as values
 *
 * usage:
 *   filterWithKeys(
 *     (key, val) => key.length === val,
 *     {red: 3, blue: 5, green: 5, yellow: 2}
 *   ); //=> {red: 3, green: 5}
 */
export const filterWithKeys = R.curry((pred, obj) =>
  R.compose(R.fromPairs, R.filter(R.apply(pred)), R.toPairs)(obj)
);

/**
 * Get object by id
 *
 * @sig: :: String -> Array -> Object
 */
export const findById = R.converge(
  R.find,
  [R.pipe(R.nthArg(0), R.propEq("id")), R.nthArg(1)]
);

/**
 * Flatten a nested object into dot-separated key / value pairs
 *
 * usage: flattenObj({a:1, b:{c:3}, d:{e:{f:6}, g:[{h:8, i:9}, 0]}})
 * //=> {"a": 1, "b.c": 3, "d.e.f": 6, "d.g.0.h": 8, "d.g.0.i": 9, "d.g.1": 0}
 */
export const flattenObj = function() {
  const go = obj_ => R.chain(([k, v]) => {
    if (typeof v == 'object') {
      return R.map(([k_, v_]) => [`${k}.${k_}`, v_], go(v));
    } else {
      return [[k, v]];
    }
  }, R.toPairs(obj_));

  return R.compose(R.fromPairs, go);
};

/**
 * Checks if a value is a plain object.
 *
 * @param {any} it - The value to check whether or not it's a plain object.
 * @return {boolean} True if it's a plain object.
 */
export const isPlainObject = it => {
  return it !== null
      && typeof it === "object"
      && (!it.constructor || it.constructor === Object)
      && {}.toString.call(it) === "[object Object]"
};

/**
 * Map keys of an object
 *
 * usage: mapKeys(R.toUpper, { a: 1, b: 2, c: 3 }); // { A: 1, B: 2, C: 3 }
 */
export const mapKeys = R.curry((fn, obj) =>
  R.fromPairs(R.map(R.adjust(fn, 0), R.toPairs(obj)))
);

/**
 * Make an object from an array using a mapper function
 *
 * usage: arr2obj(R.reverse, ['abc', 'def'])
 * // -> { abc: 'cba', def: 'fed' }
 */
export const objOfArray = R.curry((fn, arr) =>
  R.pipe(
    (list) => list.map(k => [k.toString(), fn(k)]),
    R.fromPairs
  )(arr)
);

/**
 * Get object size
 * @sig :: Object -> Number
 */
export const objSize = R.nAry(1, R.pipe(
  R.when(R.is(Object), R.keys),
  R.when(R.is(Boolean), R.cond([[R.equals(false), R.always(null)], [R.T, R.always(1)]])),
  R.when(R.is(Number), R.toString),
  R.ifElse(R.isNil, R.always(0), R.length)
));

/**
 * Remove a subset of keys from an object whose associated values satisfy a given predicate
 *
 * usage: omitWhen(R.equals(2), ['a', 'c'], { a: 1, b: 1, c: 2, d: 2 });
 * // => { a: 1, b: 1, d: 2 }
 */
export const omitWhen = R.curry((fn, ks, obj) =>
  R.merge(R.omit(ks, obj), R.reject(fn, R.pick(ks, obj))));

/**
 * pick by path
 */
export const pickPath = (names, obj) => {
  return R.reduce((acc, path) => {
    path = path.split('.');
    return R.assocPath(path, R.path(path, obj), acc);
  }, {}, names);
};

/**
 * dissoc fields by path
 */
export const dissocPaths = (names, obj) => {
  return R.reduce((acc, path) => {
    path = path.split('.');
    return R.dissocPath(path, acc);
  }, obj, names);
};

/**
 * Convert a list of property-lists (with header) into a list of objects
 *
 * usage:
 *   const tsv = [
 *     ['name',  'age', 'drink'],
 *     ['john',   23,   'wine'],
 *     ['maggie', 45,   'water']
 *   ];
 *   propertyList(tsv);
 *   //[
 *   //  {"age": 23, "drink": "wine", "name": "john"},
 *   //  {"age": 45, "drink": "water", "name": "maggie"}
 *   //]
 */
export const propertyList = R.compose(R.apply(R.lift(R.zipObj)), R.splitAt(1));

export const dotPath = R.useWith(R.path, [R.split('.')]);

export const assocDotPath = R.useWith(R.assocPath, [R.split('.')]);

// Derivative of R.props for deep fields
export const propsPath = R.useWith(R.ap, [R.map(dotPath), R.of]);

/**
 * Creates a new object with the own properties of the provided object, but the
 * keys renamed according to the keysMap object as `{oldKey: newKey}`.
 * When some key is not found in the keysMap, then it's passed as-is.
 *
 * Keep in mind that in the case of keys conflict is behaviour undefined and
 * the result may vary between various JS engines!
 *
 * usage: const input = { firstName: 'Elisia', type: 'human' }
 *        renameKeys({ firstName: 'name', type: 'kind' })(input) // //=> { name: 'Elisia', kind: 'human' }
 *
 * @sig {a: b} -> {a: *} -> {b: *}
 */
export const renameKeys = R.curry((keysMap, obj) =>
  R.reduce((acc, key) => R.assoc(keysMap[key] || key, obj[key], acc), {}, R.keys(obj))
);

/**
 * Rename keys of an object by a function
 *
 * usage: renameBy(R.concat('a'), { A: 1, B: 2, C: 3 }) // { aA: 1, aB: 2, aC: 3 }
 */
export const renameKeysBy = R.curry((fn, obj) => R.pipe(R.toPairs, R.map(R.adjust(fn, 0)), R.fromPairs)(obj));

/**
 * spread the dissoced object
 *
 * usage:
 * spread("b", { a: 1, b: { c: 3, d: 4 } }); // -> { a: 1, c: 3, d: 4 }
 */
export const spread = R.converge(R.merge, [R.dissoc, R.propOr({})]);

/**
 * An alternative to Ramda's `where` that has the following differences:
 *     1. `whereAll` can take specs that can contain a nested structure.
 *     2. `whereAll` specs can use shorthands for property detection:
 *         `true` - check if the property is present in the test object.
 *         `false` - check if the property is absent in the test object.
 *         `null` - skip the existence check for the property.
 *
 * See also:
 * https://github.com/ramda/ramda/wiki/Cookbook#whereall-sort-of-like-a-recursive-version-of-ramdas-where
 *
 * @param {any} spec - Specification to validate against.
 * @param {any} data - Data to be validated.
 * @return {boolean} True if the data passed the specification.
 */
export const whereAll = (spec, data) => {
  if (typeof data === "undefined") return typeof spec === "boolean" && !spec
  if (spec === null) return true
  if (spec === false) return false
  if (typeof spec === "number") return data === spec
  if (typeof spec === "string") return data === spec
  if (typeof spec === "symbol") return data === spec

  return Object.entries(spec).reduce((valid, [key, value]) => {
    if (typeof value === "function" && !value(data[key])) {
      return false
    }
    return whereAll(value, data[key]) ? valid : false
  }, true)
};
