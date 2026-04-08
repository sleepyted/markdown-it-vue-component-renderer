import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../example/App.vue';
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

  test('PluginDemo includes a custom syntax example for configurable matchers', async () => {
    const wrapper = mount(PluginDemo);
    await flushUi();

    const pageText = wrapper.text();

    expect(pageText).toContain('syntax');
    expect(pageText).toContain('marker');
    expect(pageText).toContain('@@@alert');
  });

  test('App exposes a dedicated matcher demo tab', async () => {
    const wrapper = mount(App);
    await flushUi();

    const buttons = wrapper.findAll('button');
    const matcherButton = buttons.find((button) => button.text().includes('matcher'));

    expect(matcherButton).toBeDefined();

    await matcherButton!.trigger('click');
    await flushUi();

    expect(wrapper.text()).toContain('syntax.matcher');
  });

  test('matcher demo explains custom block matching with tag-style syntax', async () => {
    const wrapper = mount(App);
    await flushUi();

    const buttons = wrapper.findAll('button');
    const matcherButton = buttons.find((button) => button.text().includes('matcher'));

    expect(matcherButton).toBeDefined();

    await matcherButton!.trigger('click');
    await flushUi();

    const pageText = wrapper.text();
    expect(pageText).toContain('<alert {"type":"info"}>');
    expect(pageText).toContain('</alert>');
    expect(pageText).toContain('[[alert {"type":"success"}]]');
    expect(pageText).toContain('[[/alert]]');
    expect(pageText).toContain('syntax.matcher');
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
