import Store from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/cache-store-wrapper';
import FragmentJsonAPICache from 'ember-data-model-fragments-new-gen/cache/json-api';

export default class FragmentStore extends Store {
  public createCache(storeWrapper: CacheCapabilitiesManager) {
    return new FragmentJsonAPICache(storeWrapper);
  }

//  public instantiateRecord(this: Store, identifier: StableRecordIdentifier, createRecordArgs: Record<string, unknown>) {
    
//   }

//  public teardownRecord(record: Model): void {
  
// }
}
