import { describe, expect, test, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { MarkdownRenderer } from '../src/renderer.js';
import { TestProbe, resetProbeCalls } from './helpers/TestProbe';

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('MarkdownRenderer compatibility', () => {
  beforeEach(() => {
    resetProbeCalls();
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

