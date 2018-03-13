import Rule from './rule';

const getTypedSubject = (type) => (subject) => {
  if (!subject || typeof subject === 'string') {
    return subject;
  }

  if (typeof subject === 'object' && subject.hasOwnProperty(type)) {
    return subject.id? subject[type] + ':' + subject.id : subject[type];
  }

  return subject;
};

export class Aces {

  constructor(rules, { RuleType = Rule, TypeKey = 'type' } = {}) {
    this.RuleType = RuleType;
    this.getSubject = getTypedSubject(TypeKey);
    this._originalRules = rules;
    this._rules = {};
    this._events = {};
    this._aliases = {};
    this._update(rules);
  }

  _update(rules) {
    if (Array.isArray(rules)) {
      const payload = { rules, aces: this };

      this.emit('update', payload);
      this._originalRules = Object.freeze(rules.slice(0));
      this._rules = this._buildIndexFor(this._originalRules);
      this.emit('updated', payload);
    }

    return this;
  }

  _buildIndexFor(rules) {
    const indexedRules = {};
    const RuleType = this.RuleType;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const actions = rule.actions.concat(rule.alias);

      for (let j = 0; j < actions.length; j++) {
        const action = actions[j];
        const subjects = Array.isArray(rule.subject) ? rule.subject : [rule.subject];

        for (let k = 0; k < subjects.length; k++) {
          const subject = subjects[k];
          indexedRules[subject] = indexedRules[subject] || {};
          indexedRules[subject][action] = indexedRules[subject][action] || [];
          indexedRules[subject][action].unshift(new RuleType(rule));
        }
      }
    }

    return indexedRules;
  }

  get rules() {
    return this._originalRules;
  }

  allow(action, subject) {
    const subjectId = this.getSubject(subject);
    const rules = this.rulesFor(action, subject);

    if (subject === subjectId) {
      return rules.length > 0 && !rules[0].inverted;
    }

    for (let i = 0; i < rules.length; i++) {
      if (rules[i].matches(subject)) {
        return !rules[i].inverted;
      }
    }

    return false;
  }

  disallow(action, subject) {
    return !this.allow(action, subject);
  }

  rulesFor(action, subject) {
    const subjectId = this.getSubject(subject);
    const rules = this._rules;
    const specificRules = rules.hasOwnProperty(subjectId) ? rules[subjectId][action] : null;
    const generalRules = rules.hasOwnProperty('all') ? rules.all[action] : null;

    return (generalRules || []).concat(specificRules || []);
  }

  throwDisallow(action, subject) {
    if (this.disallow(action, subject)) {
      throw new Error(`Cannot execute "${action}" on "${this.getSubject(subject)}"`);
    }
  }

  on(event, handler) {
    const events = this._events;
    let isAttached = true;

    if (!events[event]) {
      events[event] = [];
    }

    events[event].push(handler);

    return () => {
      if (isAttached) {
        isAttached = false;
        const index = events[event].indexOf(handler);
        events[event].splice(index, 1);
      }
    };
  }

  emit(event, payload) {
    const handlers = this._events[event];

    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }
}
