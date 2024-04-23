import type {
  RecordIdentifier,
  StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type {
  TypedRecordInstance,
  TypeFromInstance,
  TypeFromInstanceOrString,
} from '@warp-drive/core-types/record';
import type Store from '.';
import type { CacheCapabilitiesManager } from './cache-store-wrapper';
import type { ResourceType } from '@warp-drive/core-types/symbols';
import type EmberObject from '@ember/object';

type Destroyable = {
  isDestroyed: boolean;
  isDestroying: boolean;
  destroy(): void;
};
/**
  @module @ember-data/store
*/

export function peekRecordIdentifier(
  record: unknown,
): StableRecordIdentifier | undefined;

/**
  Retrieves the unique referentially-stable [RecordIdentifier](/ember-data/release/classes/StableRecordIdentifier)
  assigned to the given record instance.
  ```js
  import { recordIdentifierFor } from "@ember-data/store";
  // ... gain access to a record, for instance with peekRecord or findRecord
  const record = store.peekRecord("user", "1");
  // get the identifier for the record (see docs for StableRecordIdentifier)
  const identifier = recordIdentifierFor(record);
  // access the identifier's properties.
  const { id, type, lid } = identifier;
  ```
  @method recordIdentifierFor
  @public
  @static
  @for @ember-data/store
  @param {Object} record a record instance previously obstained from the store.
  @return {StableRecordIdentifier}
 */
export function recordIdentifierFor<T extends TypedRecordInstance>(
  record: T,
): StableRecordIdentifier<TypeFromInstance<T>>;
export function recordIdentifierFor(record: unknown): StableRecordIdentifier;
export function recordIdentifierFor<T>(
  record: T,
): StableRecordIdentifier<TypeFromInstanceOrString<T>>;

export function setRecordIdentifier(
  record: unknown,
  identifier: StableRecordIdentifier,
): void;

export const StoreMap: Map<unknown, Store>;

export function storeFor(record: unknown): Store | undefined;

type FilteredKeys<T> = Omit<
  T,
  typeof ResourceType | keyof EmberObject | 'constructor'
>;

type MaybeHasId = { id?: string | null };

export type CreateRecordProperties<T = MaybeHasId & Record<string, unknown>> =
  T extends TypedRecordInstance
    ? FilteredKeys<Partial<T>>
    : T extends MaybeHasId
      ? MaybeHasId & FilteredKeys<Partial<T>>
      : MaybeHasId & Record<string, unknown>;

export class InstanceCache {
  declare store: Store;
  declare cache: Cache;
  declare _storeWrapper: CacheCapabilitiesManager;
  declare __cacheFor: (resource: RecordIdentifier) => Cache;

  constructor(store: Store);

  peek(identifier: StableRecordIdentifier): Cache | unknown | undefined;

  getRecord(
    identifier: StableRecordIdentifier,
    properties?: CreateRecordProperties,
  ): unknown;

  getReference(identifier: StableRecordIdentifier): unknown;

  recordIsLoaded(
    identifier: StableRecordIdentifier,
    filterDeleted?: boolean,
  ): boolean;

  disconnect(identifier: StableRecordIdentifier): void;

  unloadRecord(identifier: StableRecordIdentifier): void;

  clear(type?: string): void;

  // TODO this should move into something coordinating operations
  setRecordId(identifier: StableRecordIdentifier, id: string): void;
}
