import { defineComponent, h, onMounted, onUnmounted } from 'vue';

interface ProbeCalls {
  mounted: number;
  unmounted: number;
}

const calls: ProbeCalls = {
  mounted: 0,
  unmounted: 0
};

export function resetProbeCalls() {
  calls.mounted = 0;
  calls.unmounted = 0;
}

export function getProbeCalls() {
  return { ...calls };
}

export const TestProbe = defineComponent({
  name: 'TestProbe',
  props: {
    label: {
      type: String,
      default: 'Probe'
    },
    content: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    onMounted(() => {
      calls.mounted += 1;
    });

    onUnmounted(() => {
      calls.unmounted += 1;
    });

    return () =>
      h(
        'div',
        { class: 'test-probe', 'data-test-probe': 'true' },
        [
          h('strong', { class: 'test-probe-label' }, props.label),
          h('span', { class: 'test-probe-content' }, props.content)
        ]
      );
  }
});
