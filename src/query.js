import fp from 'mostly-func';

export function rulesToQuery (rules, convert) {
  const query = {};
  const ignoreOperators = {};

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const op = rule.inverted ? '$and' : '$or';

    if (fp.isEmpty(rule.conditions)) {
      if (rule.inverted) {
        return null;
      }

      if (query[op]) {
        delete query[op];
      }

      ignoreOperators[op] = true;
    } else if (!ignoreOperators.hasOwnProperty(op)) {
      query[op] = query[op] || [];
      query[op].push(convert(rule));
    }
  }

  return rules.length > 0 ? query : null;
}

function convertRuleToQuery (rule) {
  return rule.inverted ? { $nor: [rule.conditions] } : rule.conditions;
}

export function toMongoQuery (rules) {
  return rulesToQuery(rules, convertRuleToQuery);
}
