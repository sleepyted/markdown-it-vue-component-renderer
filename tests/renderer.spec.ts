import { describe, expect, test, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { MarkdownRenderer } from '../src/renderer.js';
import { TestProbe, getProbeCalls, resetProbeCalls } from './helpers/TestProbe';

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('MarkdownRenderer compatibility', () => {
  beforeEach(() => {
    resetProbeCalls();
  });

  test('destroys prior mounts when content changes', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: ':::probe\nfirst render\n:::',
        components: { probe: TestProbe }
      }
    });

    await flushPromises();

    expect(getProbeCalls()).toEqual({ mounted: 1, unmounted: 0 });

    await wrapper.setProps({
      content: ':::probe\nsecond render\n:::'
    });
    await flushPromises();

    expect(getProbeCalls()).toEqual({ mounted: 2, unmounted: 1 });
  });

  test('destroys active mounts when wrapper is unmounted', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: ':::probe\nhello\n:::',
        components: { probe: TestProbe }
      }
    });

    await flushPromises();

    expect(getProbeCalls()).toEqual({ mounted: 1, unmounted: 0 });

    wrapper.unmount();
    await flushPromises();

    expect(getProbeCalls()).toEqual({ mounted: 1, unmounted: 1 });
  });

  test('keeps only the latest async render active during rapid updates', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: ':::probe\nfirst\n:::',
        components: { probe: TestProbe }
      }
    });

    await wrapper.setProps({
      content: ':::probe\nsecond\n:::'
    });
    await flushPromises();

    expect(wrapper.find('.test-probe-content').text()).toBe('second');

    // If an earlier async render "wins" after a rapid update, we'd see extra active mounts.
    const calls = getProbeCalls();
    expect(calls.mounted - calls.unmounted).toBe(1);
  });

  test('mounts a plugin-rendered placeholder that uses data-vue-props', async () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: ':::probe\nhello from renderer\n:::',
        components: { probe: TestProbe }
      }
    });

    await flushPromises();

    expect(wrapper.find('.test-probe-content').text()).toBe('hello from renderer');
  });

  test('warns and falls back to {} when placeholder props JSON is not a plain object', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = mount(MarkdownRenderer, {
      props: {
        content: '<div data-vue-component="probe" data-vue-props="42"></div>',
        components: { probe: TestProbe }
      }
    });

    await flushPromises();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to parse props for component probe: expected a plain object but got number'
      )
    );
    expect(wrapper.find('.test-probe-content').text()).toBe('');

    warnSpy.mockRestore();
  });
});
