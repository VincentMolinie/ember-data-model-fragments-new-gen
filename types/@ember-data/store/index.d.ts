import type Service from '@ember/service';
import type { Cache } from '@warp-drive/core-types/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type { ModelSchema } from 'ember-data';
import { TypeFromInstance } from '@warp-drive/core-types/record';
import type Model from '@ember-data/model';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type {
  TypedRecordInstance,
  TypeFromInstance,
} from '@warp-drive/core-types/record';
import type { InstanceCache } from './instance-cache';
import type { IdentifierCache } from '@ember-data/store/cache';

export default class Store extends Service {
  _instanceCache: InstanceCache;
  identifierCache: IdentifierCache;

  public createCache(storeWrapper: CacheCapabilitiesManager): Cache;

  public instantiateRecord(
    this: Store,
    identifier: StableRecordIdentifier,
    createRecordArgs: Record<string, unknown>,
  ): Model;

  public teardownRecord(record: Model): void;

  public modelFor<T>(type: TypeFromInstance<T>): ModelSchema<T>;
  public modelFor(type: string): ModelSchema;

  public peekRecord<T extends Model>(modelName: string, id: string): T | null;
}

export function recordIdentifierFor<T extends TypedRecordInstance>(
  record: T,
): StableRecordIdentifier<TypeFromInstance<T>>;
export function recordIdentifierFor(record: unknown): StableRecordIdentifier;
