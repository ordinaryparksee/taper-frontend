import type { PropType } from 'vue'
import { defineComponent, h } from 'vue'

export function useDataTypeComponent<T>() {
  return defineComponent({
    props: {
      value: {
        type: Object as PropType<T>,
        required: true
      }
    },
    render() {
      return h('div', JSON.stringify(this.value))
    }
  })
}
