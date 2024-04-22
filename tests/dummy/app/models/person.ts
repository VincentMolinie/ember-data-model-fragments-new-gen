import Model, { attr } from '@ember-data/model';
import type NameFragment from 'dummy/tests/dummy/app/models/name';
import { fragment } from 'ember-data-model-fragments-new-gen/attributes';

export default class PersonModel extends Model {
  @attr('string') declare title: string;
  @attr('string') declare nickName: string;
  @fragment('name') declare name: NameFragment;
  // @fragmentArray('name') names;
  // @fragmentArray('address') addresses;
  // @array() titles;
  // @fragmentArray('hobby', { defaultValue: null }) hobbies;
  // @fragmentArray('house') houses;
  // @array() children;
  // @array('string') strings;
  // @array('number') numbers;
  // @array('boolean') booleans;
}
