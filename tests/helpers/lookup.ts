import type ApplicationInstance from '@ember/application/instance';
import type { Registry as ServiceRegistry } from '@ember/service';

import { getContext } from '@ember/test-helpers';

export function getApplicationInstance() {
  const { owner } = getContext() as { owner: ApplicationInstance };
  return owner;
}

export function getService<ServiceName extends keyof ServiceRegistry>(
  serviceName: ServiceName,
) {
  return getApplicationInstance().lookup(
    `service:${serviceName}`,
  ) as ServiceRegistry[ServiceName];
}

export function getAdapter<AdapterClass>(adapterName: string): AdapterClass {
  return getApplicationInstance().lookup(
    `adapter:${adapterName}`,
  ) as AdapterClass;
}

export function getSerializer<SerializerClass>(
  serializerName: string,
): SerializerClass {
  return getApplicationInstance().lookup(
    `serializer:${serializerName}`,
  ) as SerializerClass;
}
