import assert from 'assert';
import fp from 'mostly-func';

export class AceBuilder {
  constructor() {
    this.rules = [];
  }

  can(actions, subject, conditions) {
    assert(fp.isEmpty(actions), 'actions not provided');
    assert(fp.isEmpty(subject), 'subject not provided');

    const rule = { actions, subject };

    if (fp.is(Object, conditions) && conditions) {
      rule.conditions = conditions;
    }

    this.rules.push(rule);

    return this;
  }

  cannot(...args) {
    const rule = this.can(...args);
    rule.inverted = true;
    return this;
  }
}