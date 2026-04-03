import { beforeEach, describe, expect, it } from 'vitest';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { mountComponents } from '../src/index.js';
import type { MarkdownVueComponentOptions } from '../src/index.js';
import { TestProbe, getProbeCalls, resetProbeCalls } from './helpers/TestProbe';

function createMarkdown(components?: MarkdownVueComponentOptions['components']) {
  const md = new MarkdownIt();
  md.use(MarkdownVueComponent, {
    components: {
      probe: 'ProbeComponent',
      ...components
    }
  });
  return md;
}

function render(markdown: string, components?: MarkdownVueComponentOptions['components']) {
  const md = createMarkdown(components);
  const html = md.render(markdown);
  const container = document.createElement('div');
  container.innerHTML = html;
  const component = container.querySelector('[data-vue-component]');

  return { html, container, component };
}

function parseProps(component: Element | null) {
  if (!component) {
    return {};
  }

  const propsAttr = component.getAttribute('data-vue-props') || '{}';
  return JSON.parse(propsAttr);
}

describe('parser regressions', () => {
  beforeEach(() => {
    resetProbeCalls();
  });

  it('falls back to markdown when a container is left unclosed', () => {
    const { html, component } = render(':::probe\nunclosed body\n');

    expect(component).toBeNull();
    expect(html).toBe('<p>:::probe\nunclosed body</p>\n');
  });

  it('treats a non-JSON body as the default content prop', () => {
    const { component } = render(':::probe\nplain body text\n:::');

    expect(component).not.toBeNull();
    const props = parseProps(component);

    expect(props).toEqual({ content: 'plain body text' });
  });

  it('lets JSON in the body override inline JSON arguments', () => {
    const { component } = render(':::probe {"status":"inline"}\n{"status":"body"}\n:::');

    expect(component).not.toBeNull();
    const props = parseProps(component);

    expect(props.status).toBe('body');
  });

  it('renders placeholders using normalized dataset keys', () => {
    const { component } = render(':::probe\nplain body text\n:::');

    expect(component).not.toBeNull();
    expect(component?.getAttribute('data-vue-component')).toBe('ProbeComponent');
    expect(component?.getAttribute('data-vue-props')).toBeTruthy();
    expect(component?.getAttribute('data-vue-body')).toBeTruthy();
    expect(component?.getAttribute('data-vue-body-format')).toBeTruthy();
  });

  it('calls propsParser with raw body text + token context, and propsParser wins', () => {
    let receivedBody: string | null = null;
    let receivedTokenTypes: string[] = [];

    const { component } = render(
      'leading paragraph\n\n:::probe {"status":"inline"}\n{"status":"body"}\n:::',
      {
        probe: {
          component: 'ProbeComponent',
          propsParser(content, tokens) {
            receivedBody = content;
            receivedTokenTypes = tokens.map((token) => token.type);
            return { status: 'parser' };
          }
        }
      }
    );

    expect(component).not.toBeNull();

    expect(receivedBody).toBe('{"status":"body"}');
    expect(receivedTokenTypes.length).toBeGreaterThan(0);
    expect(receivedTokenTypes).toContain('vue_component');
    expect(receivedTokenTypes).toContain('vue_component_body');
    expect(receivedTokenTypes).not.toContain('paragraph_open');

    const props = parseProps(component);
    expect(props.status).toBe('parser');
  });

  it('supports container keys outside of [A-Za-z0-9_-]+', () => {
    const { component } = render(':::probe.widget\nplain body text\n:::', {
      'probe.widget': 'ProbeWidgetComponent'
    });

    expect(component).not.toBeNull();
    expect(component?.getAttribute('data-vue-component')).toBe('ProbeWidgetComponent');
  });

  it('mountComponents can mount a plugin-rendered placeholder with data-vue-props', async () => {
    const { container, component } = render(':::probe\nhello from plugin\n:::', {
      probe: TestProbe
    });

    expect(component).not.toBeNull();
    expect(component?.getAttribute('data-vue-props')).toBeTruthy();
    expect(component?.getAttribute('data-vue-body')).toBeTruthy();
    expect(component?.getAttribute('data-vue-body-format')).toBeTruthy();

    const controller = await mountComponents(container, { probe: TestProbe });

    expect(controller.mountedCount).toBe(1);
    expect(getProbeCalls().mounted).toBe(1);

    const renderedContent = container.querySelector('.test-probe-content');
    expect(renderedContent?.textContent).toBe('hello from plugin');

    controller.destroy();
    expect(getProbeCalls().unmounted).toBe(1);
  });
});
