import type JSONAPICache from '@ember-data/json-api';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';

export function peekCache(
  instance: StableRecordIdentifier,
): JSONAPICache | null;
