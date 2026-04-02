import { describe, expect, it } from 'vitest';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent from '../src/index.js';

function createMarkdown() {
  const md = new MarkdownIt();
  md.use(MarkdownVueComponent, {
    components: {
      probe: 'ProbeComponent'
    }
  });
  return md;
}

function render(markdown: string) {
  const md = createMarkdown();
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

  const propsAttr = component.getAttribute('data-props') || '{}';
  return JSON.parse(propsAttr);
}

describe('parser regressions', () => {
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
});
