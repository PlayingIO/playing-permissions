import { ForbiddenError } from './error';
import { Rule } from './rule';

function getSubjectTypedId(subject) {
  if (!subject || typeof subject === 'string') {
    return subject;
  }

  const Type = typeof subject === 'object' ? subject.constructor : subject;

  return Type.type + ':' + Type.id;
}

export class Aces {

  constructor(rules, { RuleType = Rule, getSubject = getSubjectTypedId } = {}) {
    this.RuleType = RuleType;
    this.getSubject = getSubject;
    this.originalRules = rules;
    this.rules = {};
    this.events = {};
    this.aliases = {};
    this._update(rules);
  }

  _update(rules) {
    if (Array.isArray(rules)) {
      const payload = { rules, aces: this };

      this.emit('update', payload);
      this.originalRules = Object.freeze(rules.slice(0));
      this.rules = this._buildIndexFor(this.rules);
      this.emit('updated', payload);
    }

    return this;
  }

  _buildIndexFor(rules) {
    const indexedRules = {};
    const RuleType = this.RuleType;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const actions = this._expandActions(rule.actions);

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

  _expandActions(rawActions) {
    const actions = Array.isArray(rawActions) ? rawActions : [rawActions];
    const aliases = this.aliases;

    return actions.reduce((expanded, action) => {
      if (aliases.hasOwnProperty(action)) {
        return expanded.concat(this._expandActions(aliases[action]));
      }

      return expanded;
    }, actions);
  }

  get rules() {
    return this.originalRules;
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
    const rules = this.rules;
    const specificRules = rules.hasOwnProperty(subjectId) ? rules[subjectId][action] : null;
    const generalRules = rules.hasOwnProperty('all') ? rules.all[action] : null;

    return (generalRules || []).concat(specificRules || []);
  }

  throwDisallow(action, subject) {
    if (this.disallow(action, subject)) {
      throw new ForbiddenError(`Cannot execute "${action}" on "${this.getSubject(subject)}"`);
    }
  }

  on(event, handler) {
    const events = this.events;
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
    const handlers = this.events[event];

    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }
}
