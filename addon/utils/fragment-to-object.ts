import { Fragment } from 'ember-data-model-fragments-new-gen/attributes/fragment';

export default function fragmentToObject(fragment: Fragment | object) {
  if (fragment instanceof Fragment) {
    return fragment.getCurrentValue();
  }
  return fragment;
}
