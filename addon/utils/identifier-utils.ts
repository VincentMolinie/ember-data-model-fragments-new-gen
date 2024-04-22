import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';

export function getIdentifierForFragment(
  owner: StableRecordIdentifier,
  key: string,
  type: string,
): { type: string; id: string } {
  return {
    type: type,
    id: `${owner.lid}:${key}`,
  };
}
