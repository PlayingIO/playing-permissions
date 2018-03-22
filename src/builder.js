function isNotEmpty (value) {
  return typeof value === 'string' || Array.isArray(value) && value.length > 0;
}

export class AceBuilder {
  constructor () {
    this._rules = [];
  }

  get rules () {
    return this._rules;
  }

  allow (params = {}) {
    if (!isNotEmpty(params.actions)) throw new TypeError('params.actions not provided');
    if (!isNotEmpty(params.subject)) throw new TypeError('params.subject not provided');

    this._rules.push(params);

    return this;
  }

  disallow (params) {
    const rule = this.allow(params);
    rule.inverted = true;
    return this;
  }
}