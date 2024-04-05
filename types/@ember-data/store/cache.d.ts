/**
  @module @ember-data/store
*/
import {
  type RecordIdentifier,
  type StableDocumentIdentifier,
  type StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type { ImmutableRequestInfo } from '@warp-drive/core-types/request';

export function isStableIdentifier(
  identifier: unknown,
): identifier is StableRecordIdentifier;

export function isDocumentIdentifier(
  identifier: unknown,
): identifier is StableDocumentIdentifier;

interface KeyOptions {
  lid: IdentifierMap;
  id: IdentifierMap;
}
type TypeMap = { [key: string]: KeyOptions };

// type IdentifierTypeLookup = { all: Set<StableRecordIdentifier>; id: Map<string, StableRecordIdentifier> };
// type IdentifiersByType = Map<string, IdentifierTypeLookup>;
type IdentifierMap = Map<string, StableRecordIdentifier>;
type KeyInfo = {
  id: string | null;
  type: string;
};
type StableCache = {
  resources: IdentifierMap;
  documents: Map<string, StableDocumentIdentifier>;
  resourcesByType: TypeMap;
  polymorphicLidBackMap: Map<string, string[]>;
};

export type KeyInfoMethod = (
  resource: unknown,
  known: StableRecordIdentifier | null,
) => KeyInfo;

export type MergeMethod = (
  targetIdentifier: StableRecordIdentifier,
  matchedIdentifier: StableRecordIdentifier,
  resourceData: unknown,
) => StableRecordIdentifier;

/**
 * Each instance of {Store} receives a unique instance of a IdentifierCache.
 *
 * This cache is responsible for assigning or retrieving the unique identify
 * for arbitrary resource data encountered by the store. Data representing
 * a unique resource or record should always be represented by the same
 * identifier.
 *
 * It can be configured by consuming applications.
 *
 * @class IdentifierCache
   @public
 */
export class IdentifierCache {
  upgradeIdentifier(resource: {
    type: string;
    id: string | null;
    lid?: string;
  }): StableRecordIdentifier;

  /**
    Returns the DocumentIdentifier for the given Request, creates one if it does not yet exist.
    Returns `null` if the request does not have a `cacheKey` or `url`.

    @method getOrCreateDocumentIdentifier
    @param request
    @return {StableDocumentIdentifier | null}
    @public
  */
  getOrCreateDocumentIdentifier(
    request: ImmutableRequestInfo,
  ): StableDocumentIdentifier | null;

  /**
    Returns the Identifier for the given Resource, creates one if it does not yet exist.

    Specifically this means that we:

    - validate the `id` `type` and `lid` combo against known identifiers
    - return an object with an `lid` that is stable (repeated calls with the same
      `id` + `type` or `lid` will return the same `lid` value)
    - this referential stability of the object itself is guaranteed

    @method getOrCreateRecordIdentifier
    @param resource
    @return {StableRecordIdentifier}
    @public
  */
  getOrCreateRecordIdentifier(resource: unknown): StableRecordIdentifier;

  /**
   Returns a new Identifier for the supplied data. Call this method to generate
   an identifier when a new resource is being created local to the client and
   potentially does not have an `id`.

   Delegates generation to the user supplied `GenerateMethod` if one has been provided
   with the signature `generateMethod({ type }, 'record')`.

   @method createIdentifierForNewRecord
   @param data
   @return {StableRecordIdentifier}
   @public
  */
  createIdentifierForNewRecord(data: {
    type: string;
    id?: string | null;
  }): StableRecordIdentifier;

  /**
   Provides the opportunity to update secondary lookup tables for existing identifiers
   Called after an identifier created with `createIdentifierForNewRecord` has been
   committed.

   Assigned `id` to an `Identifier` if `id` has not previously existed; however,
   attempting to change the `id` or calling update without providing an `id` when
   one is missing will throw an error.

    - sets `id` (if `id` was previously `null`)
    - `lid` and `type` MUST NOT be altered post creation

    If a merge occurs, it is possible the returned identifier does not match the originally
    provided identifier. In this case the abandoned identifier will go through the usual
    `forgetRecordIdentifier` codepaths.

    @method updateRecordIdentifier
    @param identifierObject
    @param data
    @return {StableRecordIdentifier}
    @public
  */
  updateRecordIdentifier(
    identifierObject: RecordIdentifier,
    data: unknown,
  ): StableRecordIdentifier;

  /**
   Provides the opportunity to eliminate an identifier from secondary lookup tables
   as well as eliminates it from ember-data's own lookup tables and book keeping.

   Useful when a record has been deleted and the deletion has been persisted and
   we do not care about the record anymore. Especially useful when an `id` of a
   deleted record might be reused later for a new record.

   @method forgetRecordIdentifier
   @param identifierObject
   @public
  */
  forgetRecordIdentifier(identifierObject: RecordIdentifier): void;

  destroy(): void;
}

export interface Op {
  op: string;
}

// Occasionally the IdentifierCache
// discovers that two previously thought
// to be distinct Identifiers refer to
// the same ResourceBlob. This Operation
// will be performed giving the Cache the
// change to cleanup and merge internal
// state as desired when this discovery
// is made.
export interface MergeOperation extends Op {
  op: 'mergeIdentifiers';
  // existing
  record: StableRecordIdentifier;
  // new
  value: StableRecordIdentifier;
}

export interface RemoveOperation extends Op {
  op: 'removeIdentifier';
  record: StableRecordIdentifier;
}

// An Operation is an action that updates
// the remote state of the Cache in some
// manner. Additional Operations will be
// added in the future.
export type Operation = MergeOperation | RemoveOperation;
