import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import { typeOf } from '@ember/utils';
import { peekCache } from '@ember-data/store/-private';
import Store, { recordIdentifierFor } from '@ember-data/store';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import Model from '@ember-data/model';
import fragmentToObject from 'ember-data-model-fragments-new-gen/utils/fragment-to-object';
import { getIdentifierForFragment } from 'ember-data-model-fragments-new-gen/utils/identifier-utils';

export type FragmentIdentifier = StableRecordIdentifier & {
  parentIdentifier: StableRecordIdentifier | FragmentIdentifier;
  key: string;
};
export function isFragmentIdentifier(
  value: StableRecordIdentifier,
): value is FragmentIdentifier {
  return 'parentIdentifier' in value;
}

export function metaTypeFor(
  name: string,
  type: string,
  options?: { polymorphic?: boolean; typeKey?: string | (() => string) },
) {
  let metaType = `-mf-${name}`;

  if (type) {
    metaType += `$${type}`;
  }

  if (options && options.polymorphic) {
    let typeKey = options.typeKey || 'type';
    typeKey = typeof typeKey === 'function' ? '__dynamic__' : typeKey;
    metaType += `$${typeKey}`;
  }

  return metaType;
}

export type FragmentOptions = {
  typeKey?: string | (() => string);
  polymorphic?: boolean;
};

export function getFragmentFromRecord(
  store: Store,
  record: StableRecordIdentifier,
  type: string,
  key: string,
) {
  const ownerIdentifier = recordIdentifierFor(record);
  const fragmentIdentifier = store.identifierCache.createIdentifierForNewRecord(
    {
      id: `${ownerIdentifier.id}-${key}`,
      type,
    },
  );

  const attr = peekCache(ownerIdentifier)?.getAttr(ownerIdentifier, key);
  if (!attr) {
    return attr;
  }

  const fragmentInstance = record.store._instanceCache.getRecord(
    fragmentIdentifier,
    attr,
  );
  return fragmentInstance;
}

/**
 `MF.fragment` defines an attribute on a `DS.Model` or `MF.Fragment`. Much
 like `DS.belongsTo`, it creates a property that returns a single fragment of
 the given type.

 It takes an optional hash as a second parameter, currently supported options
 are:

 - `defaultValue`: An object literal or a function to be called to set the
 attribute to a default value if none is supplied. Values are deep copied
 before being used. Note that default values will be passed through the
 fragment's serializer when creating the fragment. Defaults to `null`.
 - `polymorphic`: Whether or not the fragments in the array can be child
 classes of the given type.
 - `typeKey`: If `polymorphic` is true, the property to use as the fragment
 type in the normalized data. Defaults to `type`.

 Example

 ```javascript
 App.Person = DS.Model.extend({
    name: MF.fragment('name', { defaultValue: {} })
  });

 App.Name = MF.Fragment.extend({
    first: DS.attr('string'),
    last: DS.attr('string')
  });
 ```

 @namespace MF
 @method fragment
 @param {String} type the fragment type
 @param {Object} options a hash of options
 @return {Attribute}
 */
export default function fragment(type: string, options: FragmentOptions = {}) {
  options = options || {};

  const metaType = metaTypeFor('fragment', type, options);

  const meta = {
    modelName: type,
    type,
    // type: metaType,
    isAttribute: true,
    isFragment: true,
    kind: 'attribute',
    fragmentKind: 'fragment',

    options,
  };
  // const fragmentId = uuid();

  let fragmentIdentifier: StableRecordIdentifier;

  // eslint-disable-next-line ember/require-computed-property-dependencies
  return computed({
    get(key) {
      // const recordData = recordDataFor(this);
      // const fragment = recordData.getFragment(key);
      // if (fragment === null) {
      //   return null;
      // }
      // return fragment._fragmentGetRecord();
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      const ownerIdentifier = recordIdentifierFor(this);
      const attr = peekCache(ownerIdentifier)?.getAttr(ownerIdentifier, key);
      if (!attr) {
        return attr;
      }

      let isInitialization = false;
      if (!fragmentIdentifier) {
        fragmentIdentifier =
          this.store.identifierCache.getOrCreateRecordIdentifier(
            getIdentifierForFragment(ownerIdentifier, key, type),
          );
        // attr = this.store.cache.clientDidCreate(fragmentIdentifier, attr);
        isInitialization = true;
      }

      const fragmentInstance = this.store._instanceCache.getRecord(
        fragmentIdentifier,
        attr,
      );
      if (isInitialization) {
        this.store.setFragmentOwner(fragmentInstance, key, this);
      }
      fragmentIdentifier = null;

      return fragmentInstance;

      // const fragment = peekCache(this)?.getFragment(recordIdentifierFor(this), type, key);
      // return ?.getAttr(recordIdentifierFor(this), key);
    },
    set(key, value) {
      assert(
        'You must pass a fragment or null to set a fragment',
        value === null ||
          value instanceof Fragment ||
          typeOf(value) === 'object',
      );

      assert(
        'You cannot set a fragment of another model on this model',
        !(value instanceof Fragment) ||
          !this.store.getFragmentOwner(value) ||
          this.store.getFragmentOwner(value).owner === this,
      );
      // const recordData = recordDataFor(this);
      // if (value === null) {
      //   recordData.setDirtyFragment(key, null);
      //   return null;
      // }
      // if (isFragment(value)) {
      //   assert(
      //     `You can only set '${type}' fragments to this property`,
      //     isInstanceOfType(this.store.modelFor(type), value),
      //   );
      //   setFragmentOwner(value, recordData, key);
      //   recordData.setDirtyFragment(key, recordDataFor(value));
      //   return value;
      // }
      // const fragmentRecordData = recordData.getFragment(key);
      // const actualType = getActualFragmentType(type, options, value, this);
      // if (fragmentRecordData?.modelName !== actualType) {
      //   const fragment = this.store.createFragment(actualType, value);
      //   setFragmentOwner(fragment, recordData, key);
      //   recordData.setDirtyFragment(key, recordDataFor(fragment));
      //   return fragment;
      // }
      // const fragment = fragmentRecordData._fragmentGetRecord();
      // fragment.setProperties(value);
      // return fragment;

      const identifier = recordIdentifierFor(this);
      assert(
        `Attempted to set '${key}' on the deleted record ${identifier.type}:${identifier.id} (${identifier.lid})`,
        !this.currentState.isDeleted,
      );
      const cache = peekCache(identifier);

      if (value instanceof Fragment) {
        const fragmentIdentifier = recordIdentifierFor(value);
        this.store.identifierCache.updateRecordIdentifier(
          fragmentIdentifier,
          getIdentifierForFragment(identifier, key, type),
        );
      }

      const currentValue = cache?.getAttr(identifier, key);
      const valueAsObject = fragmentToObject(value);
      if (currentValue !== valueAsObject && (!currentValue || !value)) {
        cache?.setAttr(identifier, key, valueAsObject);

        if (!this.isValid) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { errors } = this;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          if (errors.get(key)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            errors.remove(key);
            this.currentState.cleanErrorRequests();
          }
        }
      } else if (
        JSON.stringify(currentValue) !== JSON.stringify(valueAsObject)
      ) {
        cache?.setAttr(identifier, key, valueAsObject);

        if (!this.isValid) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { errors } = this;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          if (errors.get(key)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            errors.remove(key);
            this.currentState.cleanErrorRequests();
          }
        }

        // this.constructor.eachAttributes((attributeName) => {});
      }
      if (!value) {
        return value;
      }

      let fragmentIdentifier;
      if (value instanceof Fragment) {
        fragmentIdentifier = recordIdentifierFor(value);
        this.store.identifierCache.updateRecordIdentifier(
          fragmentIdentifier,
          getIdentifierForFragment(identifier, key, type),
        );
      } else {
        fragmentIdentifier =
          this.store.identifierCache.getOrCreateRecordIdentifier(
            getIdentifierForFragment(identifier, key, type),
          );
      }

      const fragmentInstance = this.store._instanceCache.getRecord(
        fragmentIdentifier,
        value,
      );
      return fragmentInstance;
    },
  }).meta(meta);
}

export class Fragment extends Model {
  _parent: Model | Fragment;

  getCurrentValue() {
    const cache = peekCache(this);

    const { owner, key } = this.store.getFragmentOwner(this) || {};
    if (!owner) {
      const currentValue: Record<string, unknown> = {};
      const identifier = recordIdentifierFor(this);
      this.constructor.eachAttribute((attributeName) => {
        currentValue[attributeName] = cache?.getAttr(identifier, attributeName);
      });
      return currentValue;
    }

    const ownerIdentifier = recordIdentifierFor(owner);

    return cache.getAttr(ownerIdentifier, key);
  }
}
