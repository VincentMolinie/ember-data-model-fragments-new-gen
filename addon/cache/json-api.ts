import JSONAPICache from '@ember-data/json-api';
import type { FieldSchema } from '@ember-data/store/schema-service';
import { assert } from '@ember/debug';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import { CACHE_OWNER } from '@warp-drive/core-types/identifier';
import type FragmentStore from 'ember-data-model-fragments-new-gen/services/store';
import { getIdentifierForFragment } from 'ember-data-model-fragments-new-gen/utils/identifier-utils';

export default class FragmentJsonAPICache extends JSONAPICache {
  private _fragmentCache: Map<StableRecordIdentifier, Map<string, Fragment>> =
    new Map();

  getFragment(identifier: StableRecordIdentifier, type: string, attr: string) {
    // if (!this._fragmentCache.has(identifier)) {
    //   this._fragmentCache.set(identifier, new Map());
    // }

    // const recordCache = this._fragmentCache.get(identifier);
    const fragmentIdentifier: StableRecordIdentifier = {
      id: `${identifier.id}-${attr}`,
      type,
    };
    return this._capabilities._store._instanceCache.getRecord(
      fragmentIdentifier,
      this.getAttr(identifier, attr),
    );
    // if (!recordCache?.has(attr)) {
    //   const owner = getOwner(this)!;

    //   recordCache?.set(
    //     attr,
    //     factory.class.create(this.getAttr(identifier, attr)),
    //   );
    // }

    // return recordCache?.get(attr);
  }

  setFragment(
    identifier: StableRecordIdentifier,
    type: string,
    attr: string,
    value: object,
  ) {
    this.setAttr(identifier, attr, value);
  }

  setAttr(
    identifier: StableRecordIdentifier,
    attr: string,
    value: Value,
  ): void {
    const result = super.setAttr(identifier, attr, value);

    if (value) {
      this.applyToAllFragments(
        identifier,
        (fragmentIdentifier: StableRecordIdentifier, fieldName: string) => {
          if (fieldName === attr) {
            Object.keys(value).forEach((key) => {
              this.setAttr(fragmentIdentifier, key, value[key]);
            });
          }
        },
      );
    }

    return result;
  }

  private applyToAllFragments<T>(
    identifier: StableRecordIdentifier,
    callback: (
      fragment: StableRecordIdentifier,
      fieldName: string,
      fieldType: FieldSchema,
    ) => T,
  ) {
    const storeWrapper = this._capabilities;
    if (storeWrapper._store.isDestroying || storeWrapper._store.isDestroyed)
      return;
    const fields = storeWrapper.schema.fields(identifier);

    const results: T[] = [];
    fields.keys().forEach((fieldName: string) => {
      const fieldType = fields.get(fieldName);

      if (
        !fieldType ||
        !('isFragment' in fieldType) ||
        !('type' in fieldType) ||
        !fieldType.type
      )
        return;

      const { identifierCache } = this._capabilities;

      const fragmentIdentifier = identifierCache.getOrCreateRecordIdentifier(
        getIdentifierForFragment(identifier, fieldName, fieldType.type),
      );

      results.push(callback(fragmentIdentifier, fieldName, fieldType));
    });

    return results;
  }

  upsert(
    identifier: StableRecordIdentifier,
    data: object,
    calculateChanges?: boolean,
  ) {
    const result = super.upsert(identifier, data, calculateChanges);
    const storeWrapper = this._capabilities;

    const callback = (
      fragmentIdentifier: StableRecordIdentifier,
      fieldName: string,
      fieldType: FieldSchema,
    ) => {
      const isIdField = fieldName === 'id';
      const isFieldAbsentFromPayload =
        !('attributes' in data) ||
        !data?.attributes ||
        !(fieldName in data.attributes);
      const isFieldWithDefaultValue = !!fieldType.options?.defaultValue;
      if (isIdField || (isFieldAbsentFromPayload && !isFieldWithDefaultValue)) {
        return;
      }

      const value = isFieldAbsentFromPayload
        ? getDefaultValue(fieldType, identifier, storeWrapper._store)
        : data.attributes[fieldName];
      this.upsert(
        fragmentIdentifier,
        { attributes: value } as object,
        calculateChanges,
      );
    };
    this.applyToAllFragments(identifier, callback);

    return result;
  }

  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, Value> | undefined,
  ): Record<string, unknown> {
    const result = super.clientDidCreate(identifier, options);

    if (options) {
      const callback = (
        fragmentIdentifier: StableRecordIdentifier,
        fieldName: string,
        fieldType: FieldSchema,
      ) => {
        if (
          fieldName === 'id' ||
          ((!options || !(fieldName in options)) &&
            !fieldType.options?.defaultValue)
        ) {
          return;
        }

        this.clientDidCreate(
          fragmentIdentifier,
          options?.[fieldName] ??
            getDefaultValue(fieldType, identifier, this._capabilities._store),
        );
      };
      this.applyToAllFragments(identifier, callback);
    }

    return result;
  }

  unloadRecord(identifier: StableRecordIdentifier): void {
    super.unloadRecord(identifier);

    this.applyToAllFragments(
      identifier,
      (fragmentIdentifier: StableRecordIdentifier) => {
        this.unloadRecord(fragmentIdentifier);
      },
    );
  }

  willCommit(identifier: StableRecordIdentifier): void {
    super.willCommit(identifier);

    this.applyToAllFragments(
      identifier,
      (fragmentIdentifier: StableRecordIdentifier) => {
        this.willCommit(fragmentIdentifier);
      },
    );
  }

  didCommit(
    committedIdentifier: StableRecordIdentifier,
    result: StructuredDataDocument<SingleResourceDocument>,
  ) {
    const res = super.didCommit(committedIdentifier, result);

    this.applyToAllFragments(
      committedIdentifier,
      (fragmentIdentifier: StableRecordIdentifier, fieldName: string) => {
        if (fieldName in result) {
          this.didCommit(fragmentIdentifier, result[fieldName]);
        }
      },
    );

    return res;
  }

  commitWasRejected(
    identifier: StableRecordIdentifier,
    errors?: JsonApiError[] | undefined,
  ): void {
    super.commitWasRejected(identifier, errors);

    this.applyToAllFragments(
      identifier,
      (fragmentIdentifier: StableRecordIdentifier) => {
        this.commitWasRejected(fragmentIdentifier);
      },
    );
  }

  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    return (
      super.hasChangedAttrs(identifier) ||
      this.applyToAllFragments(
        identifier,
        (fragmentIdentifier: StableRecordIdentifier) => {
          return this.hasChangedAttrs(fragmentIdentifier);
        },
      ).some((value: boolean) => value)
    );
  }

  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    const result = super.rollbackAttrs(identifier);

    this.applyToAllFragments(
      identifier,
      (fragmentIdentifier: StableRecordIdentifier) => {
        this.rollbackAttrs(fragmentIdentifier);
      },
    );

    return result;
  }

  setIsDeleted(identifier: StableRecordIdentifier, value: boolean): void {
    super.setIsDeleted(identifier, value);

    this.applyToAllFragments(
      identifier,
      (fragmentIdentifier: StableRecordIdentifier) => {
        this.setIsDeleted(fragmentIdentifier, value);
      },
    );
  }
}

function getDefaultValue(
  schema: FieldSchema | undefined,
  identifier: StableRecordIdentifier,
  store: FragmentStore,
): unknown {
  const options = schema?.options;

  if (!schema || (!options && !schema.type)) {
    return;
  }

  if (schema.kind !== 'attribute' && schema.kind !== 'field') {
    return;
  }

  // legacy support for defaultValues that are functions
  if (typeof options?.defaultValue === 'function') {
    // If anyone opens an issue for args not working right, we'll restore + deprecate it via a Proxy
    // that lazily instantiates the record. We don't want to provide any args here
    // because in a non @ember-data/model world they don't make sense.
    return options.defaultValue() as unknown;
    // legacy support for defaultValues that are primitives
  } else if (options && 'defaultValue' in options) {
    const defaultValue = options.defaultValue;
    assert(
      `Non primitive defaultValues are not supported because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null,
    );
    return defaultValue as unknown;

    // new style transforms
  } else if (schema.kind !== 'attribute' && schema.type) {
    const transform = (
      store.schema as unknown as {
        transforms?: Map<
          string,
          {
            defaultValue(
              options: Record<string, unknown> | null,
              identifier: StableRecordIdentifier,
            ): Value;
          }
        >;
      }
    ).transforms?.get(schema.type);

    if (transform?.defaultValue) {
      return transform.defaultValue(options || null, identifier);
    }
  }
}
