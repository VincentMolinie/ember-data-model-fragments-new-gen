import { computed } from '@ember/object';

export default function fragmentOwner() {
  const meta = {
    isAttribute: false,
    isFragment: true,
    kind: 'owner',
  };

  // eslint-disable-next-line ember/require-computed-property-dependencies
  return computed({
    get() {
      return this.store.getFragmentOwner(this);
    },
    set() {
      throw new Error('Cannot set fragment owner');
    },
  }).meta(meta);
}
