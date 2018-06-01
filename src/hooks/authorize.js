import assert from 'assert';
import makeDebug from 'debug';
import fp from 'mostly-func';
import { plural } from 'pluralize';

import Aces from '../aces';
import AceBuilder from '../builder';
import { toMongoQuery } from '../query';
import Rule from '../rule';

const debug = makeDebug('playing:permissions:hooks:authorize');

const defaultOptions = {
  idField: 'id',
  TypeKey: 'type',
  primary: { field: 'primary' },
  parent: { field: 'parent' }, // permissions from parent
  ancestors: { field: 'parent', service: null },  // more inherited permissions from ancestors
  inherited: { field: 'inherited' } // whether the resource inherite permissions
};

function getPermissions (user) {
  if (user) {
    const groupPermissions = fp.flatMap(fp.pathOr([], ['permissions']), user.groups || []);
    return fp.concat(groupPermissions, user.permissions || []);
  }
  return [];
}

function defineAcesFor (permissions, { TypeKey = 'type' }) {
  const builder = new AceBuilder();

  for (const permission of permissions) {
    builder.allow(permission);
  }

  return new Aces(builder.rules, { TypeKey });
}

export default function authorize (subject, opts = {}) {
  assert(subject, 'Subject for permission rules is not provided');
  opts = fp.assignAll(defaultOptions, opts);
  const TypeKey = opts.TypeKey;

  return async function (context) {
    if (context.type !== 'before') {
      throw new Error(`The 'authorize' hook should only be used as a 'before' hook.`);
    }

    let params = { query: {}, ...context.params };

    // If it was an internal call then skip this hook
    if (!params.provider) return context;

    let action = params.action || context.method;

    const userPermissions = getPermissions(params.user);
    const userAces = defineAcesFor(userPermissions , { TypeKey });

    // get parent and ancestors permissions by populate
    const getAncestors = async (id, ancestors) => {
      const svcResource = ancestors.service
        ? context.app.service(ancestors.service)
        : context.app.service(plural(subject));
      const resource = await svcResource.get(id, {
        query: { $select: `${ancestors.field},*` }
      });
      if (resource && resource[ancestors.field]) {
        return fp.concat(resource.ancestors, [fp.dissoc(ancestors.field, resource)]);
      } else {
        return resource? [resource] : [];
      }
    };

    const throwDisallowed = (action, resources) => {
      let disallow = true;
      // reverse loop to check by inheritance
      for (let i = resources.length - 1; i >= 0; i--) {
        if (!resources[i]) break;
        // add type to resource, TypeKey default to subject
        const type = resources[i][TypeKey] || subject;
        const resource = fp.assoc(TypeKey, type, resources[i]);
        // check rules with resource
        disallow = disallow && userAces.disallow(action, resource);
        if (!resource[opts.inherited.field]) break;
      }
      const resourceId = fp.propOf('id', resources[0]);
      debug(`Authorize: ${action} resource ${resourceId} is ` + disallow? 'disallowed' : 'allowed');
      if (disallow) {
        throw new Error(`Not allowed to ${action} on ${subject} ${resourceId} in ${context.service.name} service`);
      }
    };

    // use primary as parent
    const primary = context.params[opts.primary.field];
    const parent = primary || context.data[opts.parent.field];
    if (primary) {
      // add route path to action
      action = [fp.tail(context.path.split('/')), action].join('/');
    }

    if (context.method === 'create') {
      if (parent) {
        // use parent for checking permissions
        const data = fp.assoc(opts.inherited.field, true, context.data);
        const ancestors = await getAncestors(parent, opts.ancestors);
        if (primary && fp.isEmpty(ancestors)) {
          throw new Error(`Not allowed to ${action} on ${subject} ${primary} not exists`);
        }
        throwDisallowed(action, fp.concat(ancestors, [data]));
      } else {
        throwDisallowed(action, [context.data]);
      }
    }
    // find, multi update/patch/remove
    else if (!context.id) {
      const rules = userAces.rulesFor(action, subject);
      const query = toMongoQuery(rules);

      if (query) {
        params.query = fp.assignAll(params.query, query);
      } else {
        context.result = {
          message: 'No data found with your permissions',
          metadata: {
            total: 0,
            limit: context.params.query.$limit || 10,
            skip: context.params.query.$skip || 0,
          },
          data: []
        };
      }

      context.params = params;
      return context;
    }
    // get, update, patch, remove, action
    else {
      if (parent) {
        // use parent for checking permissions
        const data = {
          [opts.idField]: context.id,
          [opts.inherited.field]: true
        };
        const ancestors = await getAncestors(parent, opts.ancestors);
        if (primary && fp.isEmpty(ancestors)) {
          throw new Error(`Not allowed to ${action} on ${subject} ${primary} not exists`);
        }
        throwDisallowed(action, fp.concat(ancestors, [data]));
      } else {
        const resources = await getAncestors(context.id, opts.ancestors);
        throwDisallowed(action, resources);
      }

      return context;
    }
  };
}
