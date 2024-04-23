import Store from 'ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/cache-store-wrapper';
import FragmentJsonAPICache from 'ember-data-model-fragments-new-gen/cache/json-api';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import { Fragment } from 'ember-data-model-fragments-new-gen/attributes/fragment';
import Model from '@ember-data/model';
import type ModelRegistry from 'ember-data/types/registries/model';
import { getIdentifierForFragment } from 'ember-data-model-fragments-new-gen/utils/identifier-utils';
import { recordIdentifierFor } from '@ember-data/store';

export default class FragmentStore extends Store {
  private fragmentOwners: Map<Fragment, { owner: Model; parentKey: string }> =
    new Map();

  public getFragmentOwner(record: Fragment) {
    return this.fragmentOwners.get(record);
  }

  public setFragmentOwner(record: Fragment, key: string, owner: Model) {
    this.fragmentOwners.set(record, owner);
  }

  public createCache(storeWrapper: CacheCapabilitiesManager) {
    return new FragmentJsonAPICache(storeWrapper);
  }

  public instantiateRecord(
    this: Store,
    identifier: StableRecordIdentifier,
    createRecordArgs: Record<string, unknown>,
  ) {
    if (createRecordArgs && createRecordArgs instanceof Fragment) {
      return createRecordArgs;
    }
    return super.instantiateRecord(identifier, createRecordArgs);
  }

  public createFragment<K extends keyof ModelRegistry>(
    modelName: K,
    fragmentData: Record<string, unknown>,
  ): ModelRegistry[K] {
    const fragment = this.createRecord(modelName, fragmentData);

    return fragment;
  }

  public teardownRecord(record: Model): void {
    if (!this.isDestroying) {
      const identifier = recordIdentifierFor(record);
      const fields = this.schema.fields(identifier);
      fields.keys().forEach((fieldName: string) => {
        const fieldType = fields.get(fieldName);
        if (
          !fieldType ||
          !('isFragment' in fieldType) ||
          !('type' in fieldType) ||
          !fieldType.type
        )
          return;

        const fragmentIdentifier =
          this.identifierCache.getOrCreateRecordIdentifier(
            getIdentifierForFragment(identifier, fieldName, fieldType.type),
          );
        const fragment = this.peekRecord(fragmentIdentifier);
        if (fragment) {
          this.teardownRecord(fragment);
        }
      });
    }

    return super.teardownRecord(record);
  }
}
