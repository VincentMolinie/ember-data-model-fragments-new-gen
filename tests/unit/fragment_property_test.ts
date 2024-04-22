import { module, skip, test } from 'qunit';
import { setupApplicationTest } from '../helpers';
import type FragmentStore from 'ember-data-model-fragments-new-gen/services/store';
import NameFragment from 'dummy/models/name';
import type { TestContext } from '@ember/test-helpers';
import pushRecord from 'dummy/tests/helpers/push-record';
import { Fragment } from 'ember-data-model-fragments-new-gen';
import { fragment } from 'ember-data-model-fragments-new-gen/attributes';
import Model, { attr } from '@ember-data/model';
import EmberObject from '@ember/object';
import { schedule } from '@ember/runloop';

interface Context extends TestContext {
  store: FragmentStore;
}

module('Unit | @fragment', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach<Context>(function () {
    this.store = this.owner.lookup('service:store') as FragmentStore;
    // this.server = new Pretender();
  });

  hooks.afterEach<Context>(function () {
    // this.server.shutdown();
  });

  module('pushed records', function () {
    test<Context>('object literals are converted to instances of `Fragment`', async function (assert) {
      const person = pushRecord('person', {
        id: 'first-test',
        name: {
          first: 'Tyrion',
          last: 'Lannister',
        },
      });

      assert.ok(
        person.name instanceof NameFragment,
        'name property is an `Fragment` instance',
      );

      assert.strictEqual(
        person.name.first,
        'Tyrion',
        'nested properties have original value',
      );

      assert.strictEqual(person.hasDirtyAttributes, false);
      assert.strictEqual(person.name.hasDirtyAttributes, false);
      assert.deepEqual(person.name.changedAttributes(), {});
      assert.deepEqual(person.changedAttributes(), {});
    });

    test<Context>('null values are allowed', async function (assert) {
      pushRecord('person', {
        id: '1',
        name: null,
      });

      const person = await this.store.findRecord('person', 1);
      assert.equal(person.name, null, 'property is null');
    });
  });

  module('createFragment', function () {
    test<Context>('a fragment can be created through the store and set', async function (assert) {
      const person = pushRecord('person', { id: 'second-test' });

      const name = this.store.createFragment('name', {
        first: 'Davos',
        last: 'Seaworth',
      });

      person.name = name;

      assert.strictEqual(
        person.name.first,
        'Davos',
        'new fragment is correctly set',
      );
      assert.strictEqual(person.hasDirtyAttributes, true);
      assert.strictEqual(person.name.hasDirtyAttributes, true);
      assert.deepEqual(person.changedAttributes(), {
        name: [
          undefined,
          {
            first: 'Davos',
            last: 'Seaworth',
          },
        ],
      });
      assert.deepEqual(person.name.changedAttributes(), {
        first: [undefined, 'Davos'],
        last: [undefined, 'Seaworth'],
      });
    });
  });

  module('set fragment value', function () {
    test<Context>('a fragment set to null can be recreated through the store with a non null value', async function (assert) {
      const personFirstInstance = pushRecord('person', {
        id: 'third-test',
        name: null,
      });

      assert.strictEqual(personFirstInstance.name, null, 'name is null');
      assert.strictEqual(personFirstInstance.hasDirtyAttributes, false);

      const person = pushRecord('person', {
        id: 'third-test',
        name: {
          first: 'Bob',
          last: 'Smith',
        },
      });

      assert.equal(person.name?.first, 'Bob', 'New name is set correctly');
      assert.equal(person.name?.last, 'Smith', 'New name is set correctly');
      assert.strictEqual(person, personFirstInstance, 'The record is the same');
      assert.strictEqual(person.hasDirtyAttributes, false);
      assert.strictEqual(person.name.hasDirtyAttributes, false);
    });

    test<Context>('setting to a non-fragment or object literal throws an error', async function (assert) {
      pushRecord('person', {
        id: 'fourth-test',
      });

      const person = await this.store.findRecord('person', 'fourth-test');
      assert.throws(() => {
        person.name = this.store.createRecord('person');
      }, 'error is thrown when setting non-fragment');
    });

    test<Context>('setting fragments from other records throws an error', async function (assert) {
      const person1 = pushRecord('person', {
        id: '1',
        name: {
          first: 'Roose',
          last: 'Bolton',
        },
      });

      const person2 = pushRecord('person', {
        data: {
          type: 'person',
          id: 2,
          attributes: {},
        },
      });

      const people = [person1, person2];
      assert.throws(() => {
        people[1].name = people[0].name;
      }, 'error is thrown when setting to a fragment of another record');
    });

    test<Context>('setting to null is allowed', async function (assert) {
      pushRecord('person', {
        id: '1',
        name: {
          first: 'Barristan',
          last: 'Selmy',
        },
      });

      const person = await this.store.findRecord('person', 1);
      person.name = null;
      assert.equal(person.name, null, 'property is null');
    });

    test<Context>('setting a fragment to an object literal creates a new fragment', async function (assert) {
      const name = {
        first: 'Asha',
        last: 'Greyjoy',
      };

      pushRecord('person', {
        id: '1',
        name: null,
      });

      const person = await this.store.findRecord('person', 1);
      person.name = name;

      assert.ok(
        person.name instanceof Fragment,
        'a `Fragment` instance is created',
      );
      assert.equal(
        person.name.first,
        name.first,
        'fragment has correct values',
      );
      assert.true(person.hasDirtyAttributes);
      assert.true(person.name.hasDirtyAttributes);
      assert.deepEqual(person.changedAttributes(), {
        name: [
          null,
          {
            first: 'Asha',
            last: 'Greyjoy',
          },
        ],
      });
      assert.deepEqual(person.name.changedAttributes(), {
        first: [undefined, 'Asha'],
        last: [undefined, 'Greyjoy'],
      });
    });
    test<Context>('setting a fragment to an object literal reuses an existing fragment', async function (assert) {
      const newName = {
        first: 'Reek',
        last: null,
      };

      pushRecord('person', {
        id: '1',
        name: {
          first: 'Theon',
          last: 'Greyjoy',
        },
      });

      const person = await this.store.findRecord('person', 1);
      const name = person.name;

      person.name = newName;

      assert.equal(name, person.name, 'fragment instances are reused');
      assert.equal(
        person.name.first,
        newName.first,
        'fragment has correct values',
      );
    });
  });

  module('createRecord', function () {
    test<Context>('fragments are created from object literals when creating a record', function (assert) {
      const name = {
        first: 'Balon',
        last: 'Greyjoy',
      };

      const person = this.store.createRecord('person', {
        name: name,
      });

      assert.ok(
        person.name instanceof Fragment,
        'a `Fragment` instance is created',
      );
      assert.strictEqual(
        person.name.first,
        name.first,
        'fragment has correct values',
      );
      assert.true(person.hasDirtyAttributes);
      assert.true(person.name.hasDirtyAttributes);
      assert.deepEqual(person.changedAttributes(), {
        name: [
          undefined,
          {
            first: 'Balon',
            last: 'Greyjoy',
          },
        ],
      });
      assert.deepEqual(person.name.changedAttributes(), {
        first: [undefined, 'Balon'],
        last: [undefined, 'Greyjoy'],
      });
    });
  });

  module('defaultValue', function () {
    test<Context>('fragments can have default values', function (assert) {
      const defaultValue = {
        first: 'Iron',
        last: 'Victory',
      };

      class Ship extends Model {
        @fragment('name', { defaultValue: () => defaultValue }) name;
      }

      this.owner.register('model:ship', Ship);

      let ship = this.store.createRecord('ship');

      assert.equal(
        ship.name.first,
        defaultValue.first,
        'the default value is used when the value has not been specified',
      );

      ship.name = null;
      assert.equal(
        ship.name,
        null,
        'the default value is not used when the value is set to null',
      );

      ship = this.store.createRecord('ship', { name: null });
      assert.equal(
        ship.name,
        null,
        'the default value is not used when the value is initialized to null',
      );
    });

    test<Context>('fragment default values can be functions', function (assert) {
      const defaultValue = {
        first: 'Oath',
        last: 'Keeper',
      };

      class Sword extends Model {
        @fragment('name', {
          defaultValue() {
            return defaultValue;
          },
        })
        name;
      }

      this.owner.register('model:sword', Sword);

      const sword = this.store.createRecord('sword');

      assert.equal(
        sword.name.first,
        defaultValue.first,
        'the default value is correct',
      );
    });

    test<Context>('fragment default values that are functions are not deep copied', function (assert) {
      const defaultValue = {
        first: 'Oath',
        last: 'Keeper',
        uncopyableObject: EmberObject.create({ item: 'Longclaw' }), // Will throw an error if copied
      };

      class Sword extends Model {
        @fragment('name', {
          defaultValue() {
            return defaultValue;
          },
        })
        name;
      }

      this.owner.register('model:sword', Sword);

      const sword = this.store.createRecord('sword');

      assert.strictEqual(
        sword.name.first,
        defaultValue.first,
        'the default value is correct',
      );
      assert.strictEqual(
        sword.name.person,
        sword,
        'the fragment this.owner is assigned',
      );
      assert.true(sword.hasDirtyAttributes);
      assert.true(sword.name.hasDirtyAttributes);
      assert.true(sword.isNew);
      assert.true(sword.name.isNew);
      assert.deepEqual(sword.changedAttributes(), {});
      assert.deepEqual(sword.name.changedAttributes(), {
        first: [undefined, 'Oath'],
        last: [undefined, 'Keeper'],
      });
    });

    test<Context>('fragment default value is merged with pushed attributes', function (assert) {
      const defaultValue = {
        first: 'Iron',
        last: 'Victory',
      };

      class Ship extends Model {
        @attr('string', { defaultValue: 'USA' }) country;
        @fragment('name', { defaultValue: () => defaultValue }) name;
      }

      this.owner.register('model:ship', Ship);

      pushRecord('ship', {
        id: '1',
      });

      const ship = this.store.peekRecord('ship', 1);

      pushRecord('ship', {
        id: '1',
        country: 'USSR',
        name: {
          last: 'Challenger',
        },
      });

      assert.strictEqual(ship.country, 'USSR');
      assert.strictEqual(ship.name.first, 'Iron');
      assert.strictEqual(ship.name.last, 'Challenger');
    });

    test<Context>('fragment default value is merged with pushed attributes', function (assert) {
      const defaultValue = {
        first: 'Iron',
        last: 'Victory',
      };

      class Ship extends Model {
        @attr('string', { defaultValue: 'USA' }) country;
        @fragment('name', { defaultValue: () => defaultValue }) name;
      }

      this.owner.register('model:ship', Ship);

      pushRecord('ship', {
        id: '1',
      });

      const ship = this.store.peekRecord('ship', 1);

      pushRecord('ship', {
        id: '1',
        country: 'USSR',
        name: {
          last: 'Challenger',
        },
      });

      assert.strictEqual(ship.country, 'USSR');
      assert.strictEqual(ship.name.first, 'Iron');
      assert.strictEqual(ship.name.last, 'Challenger');
    });
  });

  module('destroy record', function () {
    test<Context>('destroy a fragment which was set to null', async function (assert) {
      pushRecord('person', {
        id: '1',
        name: {
          first: 'Barristan',
          last: 'Selmy',
        },
      });

      const person = await this.store.findRecord('person', 1);
      const name = person.name;
      person.name = null;

      person.unloadRecord();

      assert.ok(person.isDestroying, 'the model is being destroyed');
      assert.ok(name.isDestroying, 'the fragment is being destroyed');
    });

    skip<Context>('destroy the old and new fragment value', async function (assert) {
      pushRecord('person', {
        id: '1',
        name: {
          first: 'Barristan',
          last: 'Selmy',
        },
      });

      const person = await this.store.findRecord('person', 1);
      const oldName = person.name;
      const newName = this.store.createFragment('name');
      person.name = newName;

      assert.ok(
        !oldName.isDestroying,
        "don't destroy the old fragment yet because we could rollback",
      );

      person.unloadRecord();

      schedule('destroy', () => {
        assert.ok(person.isDestroying, 'the model is being destroyed');
        assert.ok(oldName.isDestroying, 'the old fragment is being destroyed');
        assert.ok(newName.isDestroying, 'the new fragment is being destroyed');
      });
    });
  });

  // test<Context>('fragments can be saved with values, then have a value set to null without causing error', async function (assert) {
  //   const defaultValue = {
  //     first: 'Iron',
  //     last: 'Victory',
  //   };

  //   class Ship extends Model {
  //     @fragment('name', { defaultValue: defaultValue }) name;
  //   }

  //   this.owner.register('model:ship', Ship);

  //   const ship = this.store.createRecord('ship');

  //   const payload = {
  //     ship: { ...defaultValue },
  //   };
  //   payload.ship.id = 3;

  //   this.server.post('/ships', () => {
  //     return [
  //       200,
  //       { 'Content-Type': 'application/json' },
  //       JSON.stringify(payload),
  //     ];
  //   });

  //   await ship.save();
  //   assert.equal(
  //     ship.name.first,
  //     defaultValue.first,
  //     'the value is set as it was saved',
  //   );

  //   ship.set('name.first', null);
  //   assert.equal(
  //     ship.name.first,
  //     null,
  //     'the value is successfully set to null',
  //   );
  // });

  // test<Context>('fragment default value function returning Fragment instances', function (assert) {
  //   const defaultValue = {
  //     first: 'Oath',
  //     last: 'Keeper',
  //   };

  //   class Sword extends Model {
  //     @fragment('name', {
  //       defaultValue(record) {
  //         return record.store.createFragment('name', defaultValue);
  //       },
  //     })
  //     name;
  //   }

  //   this.owner.register('model:sword', Sword);

  //   const sword = this.store.createRecord('sword');

  //   assert.equal(
  //     sword.name.first,
  //     defaultValue.first,
  //     'the default value is correct',
  //   );
  //   assert.strictEqual(
  //     sword.name.person,
  //     sword,
  //     'the fragment this.owner is assigned',
  //   );
  // });
});
