import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import DynamicDemo from '../example/DynamicDemo.vue';
import PluginDemo from '../example/PluginDemo.vue';
import PluginDynamicDemo from '../example/PluginDynamicDemo.vue';

async function flushUi() {
  await nextTick();
  await Promise.resolve();
}

describe('example demos', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('PluginDemo shows the current controller-based mountComponents example', async () => {
    const wrapper = mount(PluginDemo);
    await flushUi();

    const usageSnippet = wrapper.find('pre code').text();

    expect(usageSnippet).toContain('RuntimeController');
    expect(usageSnippet).toContain('controller?.destroy()');
    expect(usageSnippet).toContain('const nextController = await mountComponents');
    expect(usageSnippet).toContain('controller = nextController');
  });

  test('DynamicDemo restarts from empty content after stopping a stream', async () => {
    vi.useFakeTimers();
    const wrapper = mount(DynamicDemo);
    const buttons = wrapper.findAll('button');

    await buttons[0].trigger('click');
    await vi.advanceTimersByTimeAsync(600);
    await flushUi();

    const contentBeforeRestart = wrapper.find('.raw-content code').text();
    expect(contentBeforeRestart.length).toBeGreaterThan(0);

    await buttons[1].trigger('click');
    await buttons[0].trigger('click');
    await vi.advanceTimersByTimeAsync(300);
    await flushUi();

    const restartedContent = wrapper.find('.raw-content code').text();
    expect(restartedContent.length).toBeLessThan(contentBeforeRestart.length);
  });

  test('PluginDynamicDemo restarts from empty content after stopping a stream', async () => {
    vi.useFakeTimers();
    const wrapper = mount(PluginDynamicDemo);
    const buttons = wrapper.findAll('button');

    await buttons[0].trigger('click');
    await vi.advanceTimersByTimeAsync(600);
    await flushUi();

    const contentBeforeRestart = wrapper.find('.raw-content code').text();
    expect(contentBeforeRestart.length).toBeGreaterThan(0);

    await buttons[1].trigger('click');
    await buttons[0].trigger('click');
    await vi.advanceTimersByTimeAsync(300);
    await flushUi();

    const restartedContent = wrapper.find('.raw-content code').text();
    expect(restartedContent.length).toBeLessThan(contentBeforeRestart.length);
  });
});
