import type { AttributesFor, RelationshipsFor } from '@ember-data/custom';
import type ModelRegistry from '@ember-data/types/registries/model';

import Model from '@ember-data/model';
import { isArray } from '@ember/array';

import type { Fragment } from 'ember-data-model-fragments-new-gen';
import { getService } from 'dummy/tests/helpers/lookup';

// type FragmentArrayItemType<F extends FragmentArray<string>> = ReturnType<
//   F['objectAt']
// >;

// type GetTypeFromAsync<T> =
//   T extends CustomAsyncBelongsTo<infer ModelType>
//     ? ModelType
//     : T extends CustomAsyncHasMany<infer ModelType>
//       ? ModelType[]
//       : T;
// type PartialModel<M> = {
//   [K in keyof M]?: M[K] extends Model
//     ? PartialModel<M[K]>
//     : M[K] extends FragmentArray<string>
//       ?
//           | PartialModel<FragmentArrayItemType<M[K]>>[]
//           | EmberArray<PartialModel<FragmentArrayItemType<M[K]>>>
//       : M[K] extends Array<Model>
//         ? PartialModel<M[K][number]>[]
//         : GetTypeFromAsync<M[K]>;
// };
type PartialModel<M> = {
  [K in keyof M]?: M[K] extends Model ? PartialModel<M[K]> : M[K];
};
export type ModelPayloadFromModel<M extends Model> = {
  [K in AttributesFor<M> | RelationshipsFor<M>]?: M[K] extends Fragment
    ? PartialModel<M[K]>
    : M[K];
} & { id?: string };

export type ModelPayload<ModelName extends keyof ModelRegistry> =
  ModelPayloadFromModel<ModelRegistry[ModelName]>;

function uuidv4() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto!.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16),
  );
}

function pushRecordInternal<T extends Model>(
  type: string,
  payload: ModelPayloadFromModel<T> = {},
) {
  const store = getService('store');
  const model = store.modelFor(
    type as keyof ModelRegistry,
  ) as unknown as typeof Model;

  const relationshipsPayload = Object.keys(payload).reduce(
    (relationships, propertyName) => {
      if (
        model.relationshipNames.hasMany.includes(propertyName) ||
        model.relationshipNames.belongsTo.includes(propertyName)
      ) {
        const modelName =
          (payload[propertyName] instanceof Model &&
            payload[propertyName]?.constructor.modelName) ||
          model.relationshipsByName.get(propertyName).type;
        return {
          ...relationships,
          [propertyName]: {
            item: payload[propertyName] as
              | null
              | { id: string }
              | { id: string }[],
            modelName,
          },
        };
      }
      return relationships;
    },
    {} as Record<
      string,
      { item: null | { id: string } | { id: string }[]; modelName: string }
    >,
  );
  const relationships = relationshipsPayload
    ? Object.keys(relationshipsPayload).reduce((rel, relationshipName) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const relationship = relationshipsPayload[relationshipName];
        return {
          ...rel,
          [relationshipName]: {
            data: isArray(relationship?.item)
              ? relationship.item.map((item) => ({
                  id: item.id,
                  type: relationship.modelName,
                }))
              : relationship?.item && {
                  id: relationship.item.id,
                  type: relationship.modelName,
                },
          },
        };
      }, {})
    : {};

  return store.push({
    data: {
      id: payload.id || uuidv4(),
      type,
      attributes: payload,
      relationships,
    },
  }) as unknown as T;
}

/**
 * Push a forest record into the store.
 */
export default function pushRecord<
  ModelName extends keyof ModelRegistry & string,
  MP extends ModelPayload<ModelName>,
>(type: ModelName, payload?: MP) {
  return pushRecordInternal(type, payload || {}) as ModelRegistry[ModelName];
}
