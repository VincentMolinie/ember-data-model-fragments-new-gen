/**
 * @module @ember-data/store
 */
// eslint-disable-next-line no-restricted-imports
import type {
  StableDocumentIdentifier,
  StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';

import type Store from '../index';

export type UnsubscribeToken = object;

export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';

export type NotificationType =
  | 'attributes'
  | 'relationships'
  | 'identity'
  | 'errors'
  | 'meta'
  | 'state';

export interface NotificationCallback {
  (
    identifier: StableRecordIdentifier,
    notificationType: 'attributes' | 'relationships',
    key?: string,
  ): void;
  (
    identifier: StableRecordIdentifier,
    notificationType: 'errors' | 'meta' | 'identity' | 'state',
  ): void;
  (
    identifier: StableRecordIdentifier,
    notificationType: NotificationType,
    key?: string,
  ): void;
}

export interface ResourceOperationCallback {
  // resource updates
  (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
}

export interface DocumentOperationCallback {
  // document updates
  (
    identifier: StableDocumentIdentifier,
    notificationType: CacheOperation,
  ): void;
}

/**
 * The NotificationManager provides the ability to subscribe to
 * changes to Cache state.
 *
 * This Feature is what allows EmberData to create subscriptions that
 * work with any framework or change-notification system.
 *
 * @class NotificationManager
 * @public
 */
export default class NotificationManager {
  declare store: Store;
  declare isDestroyed: boolean;
  declare _buffered: Map<
    StableDocumentIdentifier | StableRecordIdentifier,
    [string, string | undefined][]
  >;
  declare _cache: Map<
    StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document',
    Map<
      UnsubscribeToken,
      | NotificationCallback
      | ResourceOperationCallback
      | DocumentOperationCallback
    >
  >;
  declare _tokens: Map<
    UnsubscribeToken,
    StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document'
  >;
  declare _hasFlush: boolean;
  declare _onFlushCB?: () => void;

  /**
   * Subscribe to changes for a given resource identifier, resource addition/removal, or document addition/removal.
   *
   * ```ts
   * export type CacheOperation = 'added' | 'removed' | 'updated' | 'state';
   *
   * export interface NotificationCallback {
   *   (identifier: StableRecordIdentifier, notificationType: 'attributes' | 'relationships', key?: string): void;
   *   (identifier: StableRecordIdentifier, notificationType: 'errors' | 'meta' | 'identity' | 'state'): void;
   *   (identifier: StableRecordIdentifier, notificationType: NotificationType, key?: string): void;
   * }
   * export interface ResourceOperationCallback {
   *   // resource updates
   *   (identifier: StableRecordIdentifier, notificationType: CacheOperation): void;
   * }
   * export interface DocumentOperationCallback {
   *   // document updates
   *   (identifier: StableDocumentIdentifier, notificationType: CacheOperation): void;
   * }
   * ```
   *
   * @method subscribe
   * @public
   * @param {StableDocumentIdentifier | StableRecordIdentifier | 'resource' | 'document'} identifier
   * @param {NotificationCallback | ResourceOperationCallback | DocumentOperationCallback} callback
   * @return {UnsubscribeToken} an opaque token to be used with unsubscribe
   */
  subscribe(
    identifier: StableRecordIdentifier,
    callback: NotificationCallback,
  ): UnsubscribeToken;
  subscribe(
    identifier: 'resource',
    callback: ResourceOperationCallback,
  ): UnsubscribeToken;
  subscribe(
    identifier: StableDocumentIdentifier,
    callback: DocumentOperationCallback,
  ): UnsubscribeToken;
  subscribe(
    identifier: 'document',
    callback: DocumentOperationCallback,
  ): UnsubscribeToken;

  /**
   * remove a previous subscription
   *
   * @method unsubscribe
   * @public
   * @param {UnsubscribeToken} token
   */
  unsubscribe(token: UnsubscribeToken): void;

  /**
   * Custom Caches and Application Code should not call this method directly.
   *
   * @method notify
   * @param identifier
   * @param value
   * @param key
   * @return {Boolean} whether a notification was delivered to any subscribers
   * @private
   */
  notify(
    identifier: StableRecordIdentifier,
    value: 'attributes' | 'relationships',
    key?: string,
  ): boolean;
  notify(
    identifier: StableRecordIdentifier,
    value: 'errors' | 'meta' | 'identity' | 'state',
  ): boolean;
  notify(
    identifier: StableRecordIdentifier | StableDocumentIdentifier,
    value: CacheOperation,
  ): boolean;

  destroy(): void;
}
