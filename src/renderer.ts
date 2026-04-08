import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Component,
  type PropType
} from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVueComponent, { type MarkdownVueComponentOptions } from './index.js';
import { mountComponents, type RuntimeController } from './runtime.js';

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
    const controllerRef = shallowRef<RuntimeController | null>(null);
    let renderSequence = 0;

    const destroyController = () => {
      controllerRef.value?.destroy();
      controllerRef.value = null;
    };

    const renderMarkdown = async () => {
      const container = containerRef.value;
      if (!container) {
        return;
      }

      const sequence = ++renderSequence;

      destroyController();
      
      const { html, linkify, typographer, containerClass, wrapperTag } = props.mdOptions;
      const { syntax } = props.mdOptions;
      
      const mdi = new MarkdownIt({
        html: html ?? true,
        linkify: linkify ?? true,
        typographer: typographer ?? true
      });
      
      const componentMappings: Record<string, string> = {};
      Object.keys(props.components).forEach((name) => {
        componentMappings[name] = name;
      });
      
      mdi.use(MarkdownVueComponent, {
        components: componentMappings,
        containerClass,
        wrapperTag,
        syntax
      });
      
      const htmlContent = mdi.render(props.content);
      container.innerHTML = htmlContent;

      const controller = await mountComponents(container, props.components);
      if (sequence !== renderSequence) {
        controller.destroy();
        return;
      }

      controllerRef.value = controller;
    };

    onMounted(() => {
      void renderMarkdown();
    });

    watch(() => props.content, () => void renderMarkdown());
    watch(() => props.components, () => void renderMarkdown(), { deep: true });
    watch(() => props.mdOptions, () => void renderMarkdown(), { deep: true });

    onBeforeUnmount(() => {
      // Invalidate any in-flight async render before destroying the active mounts.
      renderSequence += 1;
      destroyController();
    });

    return () => h(props.tag, { ref: containerRef, class: 'markdown-renderer' });
  }
});

export default MarkdownRenderer;
