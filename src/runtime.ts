import { createApp } from 'vue';
import type { App, Component } from 'vue';
import type { ComponentConfig } from './index.js';

type RuntimeComponentEntry = string | Component | ComponentConfig;

interface MountRecord {
  placeholder: HTMLElement;
  mountPoint: HTMLElement;
  app: App;
}

export interface RuntimeController {
  mountedCount: number;
  destroy(): void;
}

export async function mountComponents(
  container: HTMLElement,
  components: Record<string, RuntimeComponentEntry>
): Promise<RuntimeController> {
  const { componentMap, stringOnlyRegistrations } = buildComponentLookup(components);
  const placeholders = Array.from(
    container.querySelectorAll<HTMLElement>('[data-vue-component]')
  );

  const records: MountRecord[] = [];

  for (const placeholder of placeholders) {
    const componentName = placeholder.getAttribute('data-vue-component') || '';
    const component = componentMap[componentName];

    if (!component) {
      if (stringOnlyRegistrations.has(componentName)) {
        console.warn(
          `String-only registration detected; no mountable Vue component registered for "${componentName}".`
        );
      }
      continue;
    }

    const mountPoint = document.createElement('div');
    const props = parseProps(placeholder, componentName);

    placeholder.innerHTML = '';
    placeholder.appendChild(mountPoint);

    const app = createApp(component, props);
    try {
      app.mount(mountPoint);
    } catch (error) {
      cleanupRecords(records);
      if (mountPoint.parentElement === placeholder) {
        placeholder.removeChild(mountPoint);
      }
      throw error;
    }

    records.push({ placeholder, mountPoint, app });
  }

  return createController(records);
}

function createController(records: MountRecord[]): RuntimeController {
  let mountedCount = records.length;
  let destroyed = false;

  return {
    get mountedCount() {
      return mountedCount;
    },
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;

      cleanupRecords(records);

      mountedCount = 0;
    }
  };
}

function cleanupRecords(records: MountRecord[]): void {
  for (const record of records) {
    record.app.unmount();
    if (record.mountPoint.parentElement === record.placeholder) {
      record.placeholder.removeChild(record.mountPoint);
    }
  }
}

function parseProps(element: Element, componentName: string): Record<string, unknown> {
  const propsJson = element.getAttribute('data-vue-props')
    ?? element.getAttribute('data-props')
    ?? '{}';

  try {
    const parsed = JSON.parse(propsJson);
    if (isPlainObject(parsed)) {
      return parsed;
    }

    console.warn(
      `Failed to parse props for component ${componentName}: expected a plain object but got ${typeof parsed}.`
    );
    return {};
  } catch (error) {
    console.warn(`Failed to parse props for component ${componentName}:`, error);
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildComponentLookup(
  components: Record<string, RuntimeComponentEntry>
): { componentMap: Record<string, Component>; stringOnlyRegistrations: Set<string> } {
  const map: Record<string, Component> = {};
  const stringOnlyRegistrations = new Set<string>();

  for (const [key, config] of Object.entries(components)) {
    if (typeof config === 'string') {
      stringOnlyRegistrations.add(config);
      continue;
    }

    if (typeof config === 'object' && 'component' in config) {
      if (typeof config.component !== 'string') {
        map[key] = config.component;
      }
      else {
        stringOnlyRegistrations.add(config.component);
      }
      continue;
    }

    map[key] = config as Component;
  }

  return { componentMap: map, stringOnlyRegistrations };
}
