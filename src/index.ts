import type MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import type { Component } from 'vue';
import type { RuntimeController } from './runtime.js';

export interface ComponentConfig {
  component: string | Component;
  propsParser?: (content: string, tokens: Token[]) => Record<string, unknown>;
}

export interface MarkdownVueComponentOptions {
  components: Record<string, string | Component | ComponentConfig>;
  containerClass?: string;
  wrapperTag?: string;
  syntax?: MarkdownVueComponentSyntaxOptions;
}

type ComponentEntry = {
  componentName: string;
  propsParser: ((content: string, tokens: Token[]) => Record<string, unknown>) | null;
};

export interface ContainerMatcherComponentEntry {
  componentName: string;
}

export interface ContainerMatcherContext {
  state: StateBlock;
  startLine: number;
  endLine: number;
  silent: boolean;
  componentEntries: ReadonlyMap<string, ContainerMatcherComponentEntry>;
  wrapperTag: string;
}

export interface ContainerMatchResult {
  nextLine: number;
  containerKey: string;
  inlineArgsRaw?: string;
  bodyRaw?: string;
}

export type ContainerMatcher = (context: ContainerMatcherContext) => ContainerMatchResult | null;

export interface MarkdownVueComponentSyntaxOptions {
  marker?: string;
  openMarker?: string;
  closeMarker?: string;
  matcher?: ContainerMatcher;
}

type PlaceholderMeta = {
  containerKey: string;
  componentName: string;
  inlineArgsRaw: string;
  bodyRaw: string;
  propsParser: ((content: string, tokens: Token[]) => Record<string, unknown>) | null;
  contextTokens: Token[];
};

export default function MarkdownVueComponent(md: MarkdownIt, options: MarkdownVueComponentOptions) {
  const {
    components,
    containerClass = 'vue-component',
    wrapperTag = 'div',
    syntax
  } = options;

  const componentEntries = buildComponentEntries(components);
  const publicComponentEntries = buildMatcherComponentEntries(componentEntries);
  const matcher = syntax?.matcher || createDefaultMatcher(componentEntries, syntax);

  md.block.ruler.before(
    'fence',
    'vue_component',
    function vueComponentRule(state, startLine, endLine, silent) {
      const match = matcher({
        state,
        startLine,
        endLine,
        silent,
        componentEntries: publicComponentEntries,
        wrapperTag
      });

      if (!match || match.nextLine <= startLine) {
        return false;
      }

      const { containerKey } = match;
      const entry = componentEntries.get(containerKey);
      if (!entry) {
        return false;
      }

      if (silent) {
        return true;
      }

      const inlineArgsRaw = match.inlineArgsRaw || '';
      const bodyRaw = match.bodyRaw || '';

      const token = state.push('vue_component', wrapperTag, 0);
      token.block = true;
      token.meta = {
        containerKey,
        componentName: entry.componentName,
        inlineArgsRaw,
        bodyRaw,
        propsParser: entry.propsParser,
        contextTokens: buildContextTokens(
          state,
          wrapperTag,
          containerKey,
          entry.componentName,
          inlineArgsRaw,
          bodyRaw
        )
      } satisfies PlaceholderMeta;

      state.line = match.nextLine;
      return true;
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  );

  md.renderer.rules.vue_component = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const meta = (token.meta || {}) as PlaceholderMeta;

    const { props, bodyFormat } = buildPlaceholderProps(meta, meta.contextTokens);

    token.attrSet('class', `${containerClass} ${containerClass}--${meta.containerKey}`);
    token.attrSet('data-vue-component', meta.componentName);
    token.attrSet('data-vue-props', JSON.stringify(props));
    token.attrSet('data-vue-body', JSON.stringify(meta.bodyRaw));
    token.attrSet('data-vue-body-format', bodyFormat);

    const attrs = self.renderAttrs(token);
    return `<${token.tag}${attrs}></${token.tag}>`;
  };
}

export async function mountComponents(
  container: HTMLElement,
  components: Record<string, string | Component | ComponentConfig>
): Promise<RuntimeController> {
  const runtime = await import('./runtime.js');
  return runtime.mountComponents(container, components);
}

export type { RuntimeController };
export { MarkdownRenderer } from './renderer.js';
export type { MarkdownItComponentOptions } from './renderer.js';

function buildComponentEntries(
  components: Record<string, string | Component | ComponentConfig>
): Map<string, ComponentEntry> {
  const entries = new Map<string, ComponentEntry>();

  for (const [key, config] of Object.entries(components)) {
    if (typeof config === 'string') {
      entries.set(key, { componentName: config, propsParser: null });
      continue;
    }

    if (typeof config === 'object' && config !== null && 'component' in config) {
      const componentName = typeof config.component === 'string' ? config.component : key;
      entries.set(key, { componentName, propsParser: config.propsParser || null });
      continue;
    }

    entries.set(key, { componentName: key, propsParser: null });
  }

  return entries;
}

function buildMatcherComponentEntries(
  componentEntries: Map<string, ComponentEntry>
): ReadonlyMap<string, ContainerMatcherComponentEntry> {
  return new Map(
    Array.from(componentEntries.entries()).map(([key, entry]) => [
      key,
      { componentName: entry.componentName }
    ])
  );
}

function createDefaultMatcher(
  componentEntries: Map<string, ComponentEntry>,
  syntax: MarkdownVueComponentSyntaxOptions | undefined
): ContainerMatcher {
  const { openMarker, closeMarker } = resolveMarkers(syntax);
  const componentKeys = Array.from(componentEntries.keys());

  return ({ state, startLine, endLine }) => {
    const line = getLine(state, startLine);
    if (!line.startsWith(openMarker)) {
      return null;
    }

    const trimmedAfter = line.slice(openMarker.length).trimStart();
    if (!trimmedAfter) {
      return null;
    }

    const parsed = parseContainerOpen(trimmedAfter, componentKeys, openMarker);
    if (!parsed) {
      return null;
    }

    const closeLine = findCloseLine(state, startLine + 1, endLine, closeMarker);
    if (closeLine === null) {
      return null;
    }

    return {
      nextLine: closeLine + 1,
      containerKey: parsed.containerKey,
      inlineArgsRaw: parsed.inlineArgsRaw,
      bodyRaw: state.getLines(startLine + 1, closeLine, 0, false).trimEnd()
    };
  };
}

function resolveMarkers(
  syntax: MarkdownVueComponentSyntaxOptions | undefined
): { openMarker: string; closeMarker: string } {
  const marker = syntax?.marker;

  return {
    openMarker: syntax?.openMarker || marker || ':::',
    closeMarker: syntax?.closeMarker || marker || ':::'
  };
}

function findCloseLine(
  state: StateBlock,
  startLine: number,
  endLine: number,
  closeMarker: string
): number | null {
  for (let lineNo = startLine; lineNo < endLine; lineNo++) {
    const text = getLine(state, lineNo).trim();

    if (text === closeMarker) {
      return lineNo;
    }
  }

  return null;
}

function buildPlaceholderProps(
  meta: PlaceholderMeta,
  tokens: Token[]
): {
  props: Record<string, unknown>;
  bodyFormat: 'empty' | 'json' | 'text';
} {
  const inlineProps = parseJsonObject(meta.inlineArgsRaw) || {};

  const bodyTrimmed = meta.bodyRaw.trim();
  let props: Record<string, unknown> = { ...inlineProps };
  let bodyFormat: 'empty' | 'json' | 'text' = 'empty';

  if (bodyTrimmed) {
    const bodyProps = parseJsonObject(bodyTrimmed);
    if (bodyProps) {
      bodyFormat = 'json';
      props = { ...props, ...bodyProps };
    } else {
      bodyFormat = 'text';
      props = { ...props, content: bodyTrimmed };
    }
  }

  if (meta.propsParser) {
    const parsed = meta.propsParser(meta.bodyRaw, tokens);
    if (isPlainObject(parsed)) {
      props = { ...props, ...parsed };
    }
  }

  return { props, bodyFormat };
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildContextTokens(
  state: { Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token },
  wrapperTag: string,
  containerKey: string,
  componentName: string,
  inlineArgsRaw: string,
  bodyRaw: string
): Token[] {
  const open = new state.Token('vue_component_open', wrapperTag, 1);
  open.markup = `:::${containerKey}`;
  open.meta = { containerKey, componentName, inlineArgsRaw };

  const container = new state.Token('vue_component', wrapperTag, 0);
  container.markup = `:::${containerKey}`;
  container.meta = { containerKey, componentName };

  const body = new state.Token('vue_component_body', '', 0);
  body.content = bodyRaw;
  body.meta = { containerKey, componentName };

  const close = new state.Token('vue_component_close', wrapperTag, -1);
  close.markup = ':::';
  close.meta = { containerKey, componentName };

  return [open, container, body, close];
}

function parseContainerOpen(
  trimmedAfter: string,
  componentKeys: string[],
  openMarker: string
): { containerKey: string; inlineArgsRaw: string } | null {
  // Reject "::::" which would otherwise parse as a container with ":" as the name.
  if (openMarker === ':::' && trimmedAfter.startsWith(':')) {
    return null;
  }

  const spaceIndex = trimmedAfter.search(/\s/);
  if (spaceIndex !== -1) {
    const containerKey = trimmedAfter.slice(0, spaceIndex);
    const inlineArgsRaw = trimmedAfter.slice(spaceIndex).trim();
    return componentKeys.includes(containerKey) ? { containerKey, inlineArgsRaw } : null;
  }

  if (componentKeys.includes(trimmedAfter)) {
    return { containerKey: trimmedAfter, inlineArgsRaw: '' };
  }

  // Back-compat: allow inline JSON immediately after the key (e.g. ":::probe{\"a\":1}"),
  // using a best-effort "longest registered key prefix" match.
  const keys = [...componentKeys].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!trimmedAfter.startsWith(key)) {
      continue;
    }

    const remainder = trimmedAfter.slice(key.length);
    if (!remainder.startsWith('{')) {
      continue;
    }

    return { containerKey: key, inlineArgsRaw: remainder.trim() };
  }

  return null;
}

function getLine(state: StateBlock, lineNo: number): string {
  return state.src.slice(state.bMarks[lineNo] + state.tShift[lineNo], state.eMarks[lineNo]);
}
