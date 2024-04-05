/**
 * @module @ember-data/json-api
 */
import type {
  Cache,
  ChangedAttributesHash,
  RelationshipDiff,
} from '@warp-drive/core-types/cache';
import type { ResourceBlob } from '@warp-drive/core-types/cache/aliases';
import type { Change } from '@warp-drive/core-types/cache/change';
import type {
  CollectionRelationship,
  ResourceRelationship,
} from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type {
  StableDocumentIdentifier,
  StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type { Value } from '@warp-drive/core-types/json/raw';
import type {
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core-types/request';
import type {
  CollectionResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core-types/spec/document';
import type {
  CollectionResourceDocument,
  SingleResourceDocument,
} from '@warp-drive/core-types/spec/raw';
import type { JsonApiError, JsonApiResource } from './record-data-json-api';
import type { MergeOperation } from '@ember-data/store/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/cache-store-wrapper';

interface CachedResource {
  id: string | null;
  remoteAttrs: Record<string, Value | undefined> | null;
  localAttrs: Record<string, Value | undefined> | null;
  inflightAttrs: Record<string, Value | undefined> | null;
  changes: Record<string, [Value | undefined, Value]> | null;
  errors: JsonApiError[] | null;
  isNew: boolean;
  isDeleted: boolean;
  isDeletionCommitted: boolean;

  /**
   * debugging only
   *
   * @internal
   */
  inflightRelationships?: Record<string, unknown> | null;
}

/**
  A JSON:API Cache implementation.

  What cache the store uses is configurable. Using a different
  implementation can be achieved by implementing the store's
  createCache hook.

  This is the cache implementation used by `ember-data`.

  ```js
  import Cache from '@ember-data/json-api';
  import Store from '@ember-data/store';

  export default class extends Store {
    createCache(wrapper) {
      return new Cache(wrapper);
    }
  }
  ```

  @class Cache
  @public
 */

export default class JSONAPICache implements Cache {
  /**
   * The Cache Version that this implementation implements.
   *
   * @type {'2'}
   * @public
   * @property version
   */
  declare version: '2';

  declare _capabilities: CacheCapabilitiesManager;

  constructor(storeWrapper: CacheCapabilitiesManager);

  // Cache Management
  // ================

  /**
   * Cache the response to a request
   *
   * Implements `Cache.put`.
   *
   * Expects a StructuredDocument whose `content` member is a JsonApiDocument.
   *
   * ```js
   * cache.put({
   *   request: { url: 'https://api.example.com/v1/user/1' },
   *   content: {
   *     data: {
   *       type: 'user',
   *       id: '1',
   *       attributes: {
   *         name: 'Chris'
   *       }
   *     }
   *   }
   * })
   * ```
   *
   * > **Note**
   * > The nested `content` and `data` members are not a mistake. This is because
   * > there are two separate concepts involved here, the `StructuredDocument` which contains
   * > the context of a given Request that has been issued with the returned contents as its
   * > `content` property, and a `JSON:API Document` which is the json contents returned by
   * > this endpoint and which uses its `data` property to signify which resources are the
   * > primary resources associated with the request.
   *
   * StructuredDocument's with urls will be cached as full documents with
   * associated resource membership order and contents preserved but linked
   * into the cache.
   *
   * @method put
   * @param {StructuredDocument} doc
   * @return {ResourceDocument}
   * @public
   */
  put<T extends SingleResourceDocument>(
    doc: StructuredDocument<T>,
  ): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(
    doc: StructuredDocument<T>,
  ): CollectionResourceDataDocument;
  put<T extends ResourceErrorDocument>(
    doc: StructuredErrorDocument<T>,
  ): ResourceErrorDocument;
  put<T extends ResourceMetaDocument>(
    doc: StructuredDataDocument<T>,
  ): ResourceMetaDocument;

  /**
   * Update the "remote" or "canonical" (persisted) state of the Cache
   * by merging new information into the existing state.
   *
   * Note: currently the only valid resource operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @method patch
   * @public
   * @param {Operation} op the operation to perform
   * @return {void}
   */
  patch(op: MergeOperation): void;

  /**
   * Update the "local" or "current" (unpersisted) state of the Cache
   *
   * @method mutate
   * @param {Mutation} mutation
   * @return {void}
   * @public
   */
  mutate(mutation: LocalRelationshipOperation): void;

  /**
   * Peek resource data from the Cache.
   *
   * In development, if the return value
   * is JSON the return value
   * will be deep-cloned and deep-frozen
   * to prevent mutation thereby enforcing cache
   * Immutability.
   *
   * This form of peek is useful for implementations
   * that want to feed raw-data from cache to the UI
   * or which want to interact with a blob of data
   * directly from the presentation cache.
   *
   * An implementation might want to do this because
   * de-referencing records which read from their own
   * blob is generally safer because the record does
   * not require retainining connections to the Store
   * and Cache to present data on a per-field basis.
   *
   * This generally takes the place of `getAttr` as
   * an API and may even take the place of `getRelationship`
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * @method peek
   * @public
   * @param {StableRecordIdentifier | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek(identifier: StableRecordIdentifier): ResourceBlob | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request.
   *
   * This is effectively the reverse of `put` for a request in
   * that it will return the the request, response, and content
   * whereas `peek` will return just the `content`.
   *
   * @method peekRequest
   * @param {StableDocumentIdentifier}
   * @return {StructuredDocument<ResourceDocument> | null}
   * @public
   */
  peekRequest(
    identifier: StableDocumentIdentifier,
  ): StructuredDocument<ResourceDocument> | null;

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @method upsert
   * @public
   * @param identifier
   * @param data
   * @param hasRecord
   * @return {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(
    identifier: StableRecordIdentifier,
    data: JsonApiResource,
    calculateChanges?: boolean | undefined,
  ): void | string[];

  // Cache Forking Support
  // =====================

  /**
   * Create a fork of the cache from the current state.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to fork at the Store level, which will
   * utilize this method to fork the cache.
   *
   * @method fork
   * @internal
   * @return Promise<Cache>
   */
  fork(): Promise<Cache>;

  /**
   * Merge a fork back into a parent Cache.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to merge at the Store level, which will
   * utilize this method to merge the caches.
   *
   * @method merge
   * @param {Cache} cache
   * @public
   * @return Promise<void>
   */
  merge(cache: Cache): Promise<void>;

  /**
   * Generate the list of changes applied to all
   * record in the store.
   *
   * Each individual resource or document that has
   * been mutated should be described as an individual
   * `Change` entry in the returned array.
   *
   * A `Change` is described by an object containing up to
   * three properties: (1) the `identifier` of the entity that
   * changed; (2) the `op` code of that change being one of
   * `upsert` or `remove`, and if the op is `upsert` a `patch`
   * containing the data to merge into the cache for the given
   * entity.
   *
   * This `patch` is opaque to the Store but should be understood
   * by the Cache and may expect to be utilized by an Adapter
   * when generating data during a `save` operation.
   *
   * It is generally recommended that the `patch` contain only
   * the updated state, ignoring fields that are unchanged
   *
   * ```ts
   * interface Change {
   *  identifier: StableRecordIdentifier | StableDocumentIdentifier;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @method diff
   * @public
   */
  diff(): Promise<Change[]>;

  // SSR Support
  // ===========

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @method dump
   * @return {Promise<ReadableStream>}
   * @public
   */
  dump(): Promise<ReadableStream<unknown>>;

  /**
   * hydrate a Cache from a Stream with content previously serialized
   * from another instance of the same Cache, resolving when hydration
   * is complete.
   *
   * This method should expect to be called both in the context of restoring
   * the Cache during application rehydration after SSR **AND** at unknown
   * times during the lifetime of an already booted application when it is
   * desired to bulk-load additional information into the cache. This latter
   * behavior supports optimizing pre/fetching of data for route transitions
   * via data-only SSR modes.
   *
   * @method hydrate
   * @param {ReadableStream} stream
   * @return {Promise<void>}
   * @public
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void>;

  // Resource Support
  // ================

  /**
   * [LIFECYCLE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @method clientDidCreate
   * @public
   * @param identifier
   * @param createArgs
   */
  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, Value> | undefined,
  ): Record<string, unknown>;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @method willCommit
   * @public
   * @param identifier
   */
  willCommit(identifier: StableRecordIdentifier): void;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @method didCommit
   * @public
   * @param identifier
   * @param data
   */
  didCommit(
    committedIdentifier: StableRecordIdentifier,
    result: StructuredDataDocument<SingleResourceDocument>,
  ): SingleResourceDataDocument;

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @method commitWasRejected
   * @public
   * @param identifier
   * @param errors
   */
  commitWasRejected(
    identifier: StableRecordIdentifier,
    errors?: JsonApiError[] | undefined,
  ): void;

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * This method is a candidate to become a mutation
   *
   * @method unloadRecord
   * @public
   * @param identifier
   */
  unloadRecord(identifier: StableRecordIdentifier): void;

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @method getAttr
   * @public
   * @param identifier
   * @param field
   * @return {unknown}
   */
  getAttr(identifier: StableRecordIdentifier, attr: string): Value | undefined;

  /**
   * Mutate the data for an attribute in the cache
   *
   * This method is a candidate to become a mutation
   *
   * @method setAttr
   * @public
   * @param identifier
   * @param field
   * @param value
   */
  setAttr(identifier: StableRecordIdentifier, attr: string, value: Value): void;

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @method changedAttrs
   * @public
   * @param identifier
   * @return {ChangedAttributesHash} { <field>: [<old>, <new>] }
   */
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash;

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedAttrs
   * @public
   * @param identifier
   * @return {boolean}
   */
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean;

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackAttrs
   * @public
   * @param identifier
   * @return {string[]} the names of fields that were restored
   */
  rollbackAttrs(identifier: StableRecordIdentifier): string[];

  /**
     * Query the cache for the changes to relationships of a resource.
     *
     * Returns a map of relationship names to RelationshipDiff objects.
     *
     * ```ts
     * type RelationshipDiff =
    | {
        kind: 'collection';
        remoteState: StableRecordIdentifier[];
        additions: Set<StableRecordIdentifier>;
        removals: Set<StableRecordIdentifier>;
        localState: StableRecordIdentifier[];
        reordered: boolean;
      }
    | {
        kind: 'resource';
        remoteState: StableRecordIdentifier | null;
        localState: StableRecordIdentifier | null;
      };
      ```
     *
     * @method changedRelationships
     * @public
     * @param {StableRecordIdentifier} identifier
     * @return {Map<string, RelationshipDiff>}
     */
  changedRelationships(
    identifier: StableRecordIdentifier,
  ): Map<string, RelationshipDiff>;

  /**
   * Query the cache for whether any mutated relationships exist
   *
   * @method hasChangedRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @return {boolean}
   */
  hasChangedRelationships(identifier: StableRecordIdentifier): boolean;

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @return {string[]} the names of relationships that were restored
   */
  rollbackRelationships(identifier: StableRecordIdentifier): string[];

  /**
   * Query the cache for the current state of a relationship property
   *
   * @method getRelationship
   * @public
   * @param identifier
   * @param field
   * @return resource relationship object
   */
  getRelationship(
    identifier: StableRecordIdentifier,
    field: string,
  ): ResourceRelationship | CollectionRelationship;

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked
   * as locally deleted, or remove such a mark.
   *
   * This method is a candidate to become a mutation
   *
   * @method setIsDeleted
   * @public
   * @param identifier
   * @param isDeleted {boolean}
   */
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void;

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @method getErrors
   * @public
   * @param identifier
   * @return {JsonApiError[]}
   */
  getErrors(identifier: StableRecordIdentifier): JsonApiError[];

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @method isEmpty
   * @public
   * @param identifier
   * @return {boolean}
   */
  isEmpty(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @method isNew
   * @public
   * @param identifier
   * @return {boolean}
   */
  isNew(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @method isDeleted
   * @public
   * @param identifier
   * @return {boolean}
   */
  isDeleted(identifier: StableRecordIdentifier): boolean;

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @method isDeletionCommitted
   * @public
   * @param identifier
   * @return {boolean}
   */
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean;
}
