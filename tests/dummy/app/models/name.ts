import { attr } from '@ember-data/model';
import {
  Fragment,
  fragmentOwner,
} from 'ember-data-model-fragments-new-gen/attributes';

export default class NameFragment extends Fragment {
  @attr('string') declare first: string;
  @attr('string') declare last: string;
  // @fragmentArray('prefix') prefixes;
  @fragmentOwner() person;

  // ready() {
  //   this.readyWasCalled = true;
  // }
}
