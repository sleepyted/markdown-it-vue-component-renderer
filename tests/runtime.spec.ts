import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mountComponents } from '../src/index.js';
import { TestProbe, getProbeCalls, resetProbeCalls } from './helpers/TestProbe';
import { defineComponent } from 'vue';

describe('mountComponents runtime controller', () => {
  beforeEach(() => {
    resetProbeCalls();
  });

  test('returns a controller with mountedCount and destroy()', async () => {
    const container = document.createElement('div');
    container.innerHTML = `<div data-vue-component="TestProbe" data-props="{}"></div>`;

    const controller = await mountComponents(container, { TestProbe });

    expect(typeof controller.mountedCount).toBe('number');
    expect(typeof controller.destroy).toBe('function');
    expect(controller.mountedCount).toBe(getProbeCalls().mounted);
  });

  test('destroy() unmounts the mounted apps', async () => {
    const container = document.createElement('div');
    container.innerHTML = `<div data-vue-component="TestProbe" data-props="{}"></div>`;

    const controller = await mountComponents(container, { TestProbe });
    expect(getProbeCalls().mounted).toBe(1);

    controller.destroy();

    expect(getProbeCalls().unmounted).toBe(1);
    expect(controller.mountedCount).toBe(0);
  });

  test('unregistered placeholders stay in the DOM unchanged', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-vue-component="TestProbe" data-props="{}"></div>
      <div data-vue-component="Unknown">Existing content</div>
    `;

    await mountComponents(container, { TestProbe });

    const orphan = container.querySelector('[data-vue-component="Unknown"]');
    expect(orphan).toBeTruthy();
    expect(orphan?.innerHTML).toBe('Existing content');
  });

  test('warns when a string-only registration cannot mount a component', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `<div data-vue-component="ProbeComponent" data-props="{}"></div>`;

    await mountComponents(container, { ProbeComponent: 'ProbeComponent' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'String-only registration detected; no mountable Vue component registered for "ProbeComponent"'
      )
    );

    warnSpy.mockRestore();
  });

  test('warns when props JSON resolves to non-object values', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `<div data-vue-component="TestProbe" data-props="42"></div>`;

    await mountComponents(container, { TestProbe });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse props for component TestProbe: expected a plain object')
    );

    warnSpy.mockRestore();
  });

  test('cleans up earlier mounts if a later component throws during mounting', async () => {
    const Throwing = defineComponent({
      name: 'ThrowingComponent',
      setup() {
        throw new Error('boom');
      },
      render: () => null
    });

    const container = document.createElement('div');
    container.innerHTML = `
      <div data-vue-component="TestProbe" data-props="{}"></div>
      <div data-vue-component="Thrower" data-props="{}"></div>
    `;

    await expect(
      mountComponents(container, { TestProbe, Thrower: Throwing })
    ).rejects.toThrow('boom');

    expect(getProbeCalls().unmounted).toBe(1);
    const testProbePlaceholder = container.querySelector('[data-vue-component="TestProbe"]');
    expect(testProbePlaceholder?.innerHTML).toBe('');
  });

  test('warns when placeholder props JSON is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const container = document.createElement('div');
    container.innerHTML = `<div data-vue-component="TestProbe" data-props="{invalid}"></div>`;

    await mountComponents(container, { TestProbe });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse props for component TestProbe'),
      expect.anything()
    );

    warnSpy.mockRestore();
  });
});
