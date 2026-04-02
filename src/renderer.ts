import { defineComponent, h, ref, watch, onMounted, shallowRef, type Component, type PropType } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { type MarkdownVueComponentOptions } from './index.js';

export interface MarkdownRendererProps {
  content: string;
  components: Record<string, Component>;
  mdOptions?: MarkdownItComponentOptions;
}

export interface MarkdownItComponentOptions extends Omit<MarkdownVueComponentOptions, 'components'> {
  html?: boolean;
  linkify?: boolean;
  typographer?: boolean;
}

export const MarkdownRenderer = defineComponent({
  name: 'MarkdownRenderer',
  props: {
    content: {
      type: String,
      required: true
    },
    components: {
      type: Object as PropType<Record<string, Component>>,
      required: true
    },
    mdOptions: {
      type: Object as PropType<MarkdownItComponentOptions>,
      default: () => ({})
    },
    tag: {
      type: String,
      default: 'div'
    }
  },
  setup(props) {
    const containerRef = ref<HTMLElement | null>(null);
    const mountedApps = shallowRef<Array<{ app: any; mountPoint: HTMLElement }>>([]);

    const cleanupMountedApps = () => {
      mountedApps.value.forEach(({ app, mountPoint }) => {
        app.unmount();
        mountPoint.remove();
      });
      mountedApps.value = [];
    };

    const renderMarkdown = async () => {
      if (!containerRef.value) return;
      
      cleanupMountedApps();
      
      const { html, linkify, typographer, containerClass, wrapperTag } = props.mdOptions;
      
      const mdi = new MarkdownIt({
        html: html ?? true,
        linkify: linkify ?? true,
        typographer: typographer ?? true
      });
      
      const componentMappings: Record<string, string> = {};
      Object.keys(props.components).forEach(name => {
        componentMappings[name] = name;
      });
      
      mdi.use(MarkdownVueComponent, {
        components: componentMappings,
        containerClass,
        wrapperTag
      });
      
      const htmlContent = mdi.render(props.content);
      containerRef.value.innerHTML = htmlContent;
      
      const { createApp } = await import('vue');
      const elements = containerRef.value.querySelectorAll('[data-vue-component]');
      
      const newMountedApps: Array<{ app: any; mountPoint: HTMLElement }> = [];
      
      elements.forEach((el) => {
        const componentName = el.getAttribute('data-vue-component') || '';
        const propsJson = el.getAttribute('data-vue-props')
          ?? el.getAttribute('data-props')
          ?? '{}';

        const componentProps = parsePlaceholderProps(propsJson, componentName);
        
        const component = props.components[componentName];
        
        if (component) {
          const mountPoint = document.createElement('div');
          el.innerHTML = '';
          el.appendChild(mountPoint);
          const app = createApp(component, componentProps);
          app.mount(mountPoint);
          newMountedApps.push({ app, mountPoint });
        }
      });
      
      mountedApps.value = newMountedApps;
    };

    onMounted(() => {
      renderMarkdown();
    });

    watch(() => props.content, renderMarkdown);
    watch(() => props.components, renderMarkdown, { deep: true });
    watch(() => props.mdOptions, renderMarkdown, { deep: true });

    return () => h(props.tag, { ref: containerRef, class: 'markdown-renderer' });
  }
});

export default MarkdownRenderer;

function parsePlaceholderProps(propsJson: string, componentName: string): Record<string, unknown> {
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
