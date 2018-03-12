import sift from 'sift';

export default class Rule {
  constructor(params) {
    this.actions = params.actions;
    this.alias = params.alias;
    this.subject = params.subject;
    this.user = params.user;
    this.role = params.role;
    this.inverted = !!params.inverted;
    this.conditions = params.conditions;
    this._matches = this.conditions ? sift(this.conditions) : null;
  }

  matches(object) {
    return !this._matches || this._matches(object);
  }
}
