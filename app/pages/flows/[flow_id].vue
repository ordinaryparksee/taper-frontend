<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'
import type { Node, Edge } from '@vue-flow/core'
import { VueFlow, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import { FlowFileDownloadNode, FlowGetPendingKnowledgeFilesNode } from '#components'

const app = useAppConfig()
const {
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  screenToFlowCoordinate,
  onConnect,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu
} = useVueFlow()

const contextPosition = ref()
const contextNode = ref<Node>()
const contextEdge = ref<Edge>()
const nodeTypes = {
  'pending-knowledge-files': markRaw(FlowGetPendingKnowledgeFilesNode),
  'download-file': markRaw(FlowFileDownloadNode)
}
const paneContextMenuItems = ref<ContextMenuItem[][]>([
  [
    {
      label: 'Starting node',
      children: [
        {
          label: 'Pending knowledge file',
          icon: app.ui.icons.knowledge,
          onSelect() {
            addNodes({
              id: crypto.randomUUID(),
              type: 'pending-knowledge-files',
              position: contextPosition.value || { x: 0, y: 0 },
              sourcePosition: Position.Left,
              targetPosition: Position.Right,
              class: 'vue-flow__node-custom',
              data: {
              }
            })
          }
        }
      ]
    },
    {
      label: 'Embedding node',
      children: [
        {
          label: 'Download file',
          icon: app.ui.icons.download,
          onSelect() {
            addNodes({
              id: crypto.randomUUID(),
              type: 'download-file',
              position: contextPosition.value || { x: 0, y: 0 },
              sourcePosition: Position.Left,
              targetPosition: Position.Right,
              class: 'vue-flow__node-custom',
              data: {
                label: 'Download file'
              }
            })
          }
        },
        {
          label: 'Markdown parser',
          icon: 'i-material-symbols-markdown-sharp'
        }
      ]
    }
  ],
  [
    {
      label: 'Show Sidebar',
      kbds: ['meta', 's']
    },
    {
      label: 'Show Toolbar',
      kbds: ['shift', 'meta', 'd']
    },
    {
      label: 'Collapse Pinned Tabs',
      disabled: true
    }
  ]
])

const nodeContextMenuItems = ref<ContextMenuItem[][]>([
  [
    {
      label: 'Delete',
      onSelect() {
        if (contextNode.value) {
          removeNodes(contextNode.value.id)
        }
      }
    }
  ]
])

const edgeContextMenuItems = ref<ContextMenuItem[][]>([
  [
    {
      label: 'Delete',
      onSelect() {
        if (contextEdge.value) {
          removeEdges(contextEdge.value.id)
        }
      }
    }
  ]
])

const contextMenuItems = ref<ContextMenuItem[][]>([])

function handleContextMenu(e: MouseEvent) {
  contextPosition.value = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
}

function handleContextMenuOpen(_open: boolean) {
}

onConnect((param) => {
  addEdges(param)
})

onPaneContextMenu(() => {
  contextMenuItems.value = paneContextMenuItems.value
  contextNode.value = undefined
  contextEdge.value = undefined
})

onNodeContextMenu((param) => {
  contextMenuItems.value = nodeContextMenuItems.value
  contextNode.value = param.node
  contextEdge.value = undefined
})

onEdgeContextMenu((param) => {
  contextMenuItems.value = edgeContextMenuItems.value
  contextEdge.value = param.edge
  contextNode.value = undefined
})
</script>

<template>
  <div class="flex flex-col w-full">
    <div>New flow</div>
    <div class="flex-1" @contextmenu="handleContextMenu">
      <UContextMenu
        class="flex-1"
        :items="contextMenuItems"
        @update:open="handleContextMenuOpen"
      >
        <VueFlow
          :node-types="nodeTypes"
          fit-view-on-init
        >
          <Controls position="top-right" />
          <MiniMap />
          <Background />
        </VueFlow>
      </UContextMenu>
    </div>
  </div>
</template>

<style scoped>
</style>
