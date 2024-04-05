import JSONAPICache from '@ember-data/json-api';
import { getOwner } from '@ember/-internals/owner';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
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
}
