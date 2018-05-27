import makeDebug from 'debug';
import fp from 'mostly-func';
import Aces from '../aces';
import AceBuilder from '../builder';
import { toMongoQuery } from '../query';
import Rule from '../rule';

const debug = makeDebug('playing:permissions:hooks:authorize');

const defaultOptions = {
  idField: 'id',
  TypeKey: 'type',
  parent: { field: 'parent' }, // permissions from parent
  ancestors: { field: 'parent', service: null },  // more inherited permissions from ancestors
  inherited: { field: 'inherited' }
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

export default function authorize (name = null, opts = {}) {
  opts = fp.assignAll(defaultOptions, opts);
  const TypeKey = opts.TypeKey;

  return async function (context) {
    if (context.type !== 'before') {
      throw new Error(`The 'authorize' hook should only be used as a 'before' hook.`);
    }

    let params = { query: {}, ...context.params };

    // If it was an internal call then skip this hook
    if (!params.provider) return context;

    const action = params.action || context.method;
    const serviceName = name || context.path;

    const userPermissions = getPermissions(params.user);
    const userAces = defineAcesFor(userPermissions , { TypeKey });

    // get parent and ancestors permissions by populate
    const getAncestors = async (id, ancestors) => {
      const svcResource = ancestors.service
        ? context.app.service(ancestors.service)
        : context.service;
      const resource = await svcResource.get(id, {
        query: { $select: `${ancestors.field},*` }
      });
      if (resource[ancestors.field]) {
        return fp.concat(resource.ancestors, [fp.dissoc(ancestors.field, resource)]);
      } else {
        return [resource];
      }
    };

    const throwDisallowed = (action, resources) => {
      let disallow = true;
      // reverse loop to check by inheritance
      for (let i = resources.length - 1; i >= 0; i--) {
        if (!resources[i]) break;
        // add type to resource, TypeKey default to serviceName
        const resource = fp.assoc(TypeKey, resources[i][TypeKey] || serviceName, resources[i]);
        // check rules with resource
        disallow = disallow && userAces.disallow(action, resource);
        if (!resource.inherited) break;
      }
      const resource = resources[0] && resources[0].id || resources[0];
      debug(`Authorize: ${action} resource ${resource} is `, disallow? 'disallowed' : 'allowed');
      if (disallow) {
        throw new Error(`You are not allowed to ${action} ${resource}, with ${context.path}/${context.id}`);
      }
    };

    if (context.method === 'create') {
      // get the parent for checking permissions
      if (context.data[opts.parent.field]) {
        const ancestors = await getAncestors(context.data[opts.parent.field], opts.ancestors);
        context.data[opts.inherited.field] = true;
        throwDisallowed('create', fp.concat(ancestors, [context.data]));
      } else {
        throwDisallowed('create', [context.data]);
      }
    }
    // find, multi update/patch/remove
    else if (!context.id) {
      const rules = userAces.rulesFor(action, serviceName);
      const query = toMongoQuery(rules);

      if (query) {
        params.query = fp.assignAll(params.query, query);
      } else {
        context.result = {
          message: 'No data found for your account permissions',
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
      // get the resource with ancestors for checking permissions
      const resources = await getAncestors(context.id, opts.ancestors);
      throwDisallowed(action, resources);

      return context;
    }
  };
}
