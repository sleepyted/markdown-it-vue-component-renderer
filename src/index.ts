import type MarkdownIt from 'markdown-it';
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
}

export default function MarkdownVueComponent(md: MarkdownIt, options: MarkdownVueComponentOptions) {
  const { 
    components, 
    containerClass = 'vue-component', 
    wrapperTag = 'div' 
  } = options;

  const componentNames = Object.keys(components);

  for (const name of componentNames) {
    const config = components[name];
    let componentName: string;
    let componentRef: Component | null = null;
    let customPropsParser: ((content: string, tokens: Token[]) => Record<string, unknown>) | null = null;
    
    if (typeof config === 'string') {
      componentName = config;
    } else if (typeof config === 'object' && 'component' in config) {
      const comp = config.component;
      if (typeof comp === 'string') {
        componentName = comp;
      } else {
        componentName = name;
        componentRef = comp;
      }
      customPropsParser = config.propsParser || null;
    } else {
      componentName = name;
      componentRef = config as Component;
    }

    const containerName = `vue_component_${name}`;
    
    md.block.ruler.before(
      'fence',
      containerName,
      function containerRule(state, startLine, endLine, silent) {
        const pos = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];
        const line = state.src.slice(pos, max);

        const pattern = new RegExp(`^:::${name}\\b(.*)$`);
        const match = line.match(pattern);
        
        if (!match) {
          return false;
        }

        if (silent) {
          return true;
        }

        let nextLine = startLine + 1;
        const closePattern = /^:::/;

        while (nextLine < endLine) {
          const linePos = state.bMarks[nextLine] + state.tShift[nextLine];
          const lineMax = state.eMarks[nextLine];
          const lineText = state.src.slice(linePos, lineMax);

          if (closePattern.test(lineText.trim())) {
            break;
          }
          nextLine++;
        }

        const openToken = state.push(`${containerName}_open`, wrapperTag, 1);
        openToken.markup = `:::${name}`;
        openToken.block = true;
        openToken.meta = {
          componentName,
          componentRef
        };
        openToken.attrSet('class', `${containerClass} ${containerClass}--${name}`);
        openToken.attrSet('data-vue-component', componentName);
        if (componentRef) {
          openToken.attrSet('data-vue-component-instance', 'true');
        }

        const contentLines: string[] = [];
        for (let i = startLine + 1; i < nextLine; i++) {
          const linePos = state.bMarks[i] + state.tShift[i];
          const lineMax = state.eMarks[i];
          contentLines.push(state.src.slice(linePos, lineMax));
        }
        
        const rawContent = contentLines.join('\n').trim();
        
        let props: Record<string, unknown> = {};
        
        const args = match[1]?.trim() || '';
        if (args) {
          try {
            props = JSON.parse(args);
          } catch {
            // 行内 JSON 解析失败
          }
        }
        
        if (rawContent) {
          try {
            const contentProps = JSON.parse(rawContent);
            props = { ...props, ...contentProps };
          } catch {
            // 内容 JSON 解析失败
          }
        }
        
        if (customPropsParser) {
          const customProps = customPropsParser(rawContent, []);
          props = { ...props, ...customProps };
        }
        
        openToken.meta.parsedProps = props;

        state.line = nextLine + 1;

        const closeToken = state.push(`${containerName}_close`, wrapperTag, -1);
        closeToken.markup = ':::';
        closeToken.block = true;

        return true;
      },
      { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
    );
    
    md.renderer.rules[`${containerName}_open`] = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const compName = token.meta?.componentName || name;
      const parsedProps = token.meta?.parsedProps || {};
      
      const propsJson = JSON.stringify(parsedProps);
      const escapedProps = propsJson
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const attrs = self.renderAttrs(tokens[idx]);
      
      return `<${wrapperTag}${attrs} data-vue-component="${compName}" data-props="${escapedProps}">`;
    };

    md.renderer.rules[`${containerName}_close`] = function() {
      return `</${wrapperTag}>`;
    };
  }
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
