<script setup lang="ts">
import type { HeatmapDay } from '~/types/habits'

const props = defineProps<{
  days: HeatmapDay[]
}>()

const CELL_SIZE = 14
const CELL_GAP = 3
const TOTAL = CELL_SIZE + CELL_GAP

const LEVEL_COLORS: Record<number, string> = {
  0: 'var(--ui-border)',
  1: 'color-mix(in srgb, var(--ui-primary) 25%, transparent)',
  2: 'color-mix(in srgb, var(--ui-primary) 50%, transparent)',
  3: 'color-mix(in srgb, var(--ui-primary) 75%, transparent)',
  4: 'var(--ui-primary)'
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DAY_LABELS = ['', 'Seg', '', 'Qua', '', 'Sex', '']

interface CellData {
  x: number
  y: number
  day: HeatmapDay
  color: string
}

const heatmapCells = computed<CellData[]>(() => {
  if (!props.days.length) return []

  const cells: CellData[] = []
  const firstDate = new Date(props.days[0]!.date + 'T12:00:00')
  const firstDayOfWeek = firstDate.getDay() // 0=Sun

  for (let i = 0; i < props.days.length; i++) {
    const day = props.days[i]!
    const dayIndex = i + firstDayOfWeek
    const col = Math.floor(dayIndex / 7)
    const row = dayIndex % 7

    cells.push({
      x: col * TOTAL,
      y: row * TOTAL,
      day,
      color: LEVEL_COLORS[day.level] ?? LEVEL_COLORS[0]!
    })
  }

  return cells
})

const monthLabels = computed(() => {
  if (!props.days.length) return []

  const labels: Array<{ label: string, x: number }> = []
  let lastMonth = -1
  const firstDate = new Date(props.days[0]!.date + 'T12:00:00')
  const firstDayOfWeek = firstDate.getDay()

  for (let i = 0; i < props.days.length; i++) {
    const date = new Date(props.days[i]!.date + 'T12:00:00')
    const month = date.getMonth()
    if (month !== lastMonth) {
      const dayIndex = i + firstDayOfWeek
      const col = Math.floor(dayIndex / 7)
      labels.push({ label: MONTH_LABELS[month]!, x: col * TOTAL })
      lastMonth = month
    }
  }

  return labels
})

const svgWidth = computed(() => {
  if (!heatmapCells.value.length) return 0
  const maxX = Math.max(...heatmapCells.value.map(c => c.x))
  return maxX + CELL_SIZE + 40
})

const svgHeight = computed(() => 7 * TOTAL + 20)

const tooltipCell = ref<CellData | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

function onCellHover(cell: CellData, event: MouseEvent) {
  tooltipCell.value = cell
  tooltipPos.value = { x: event.clientX, y: event.clientY }
}

function onCellLeave() {
  tooltipCell.value = null
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto pb-2">
      <svg :width="svgWidth + 30" :height="svgHeight + 20" class="min-w-full">
        <!-- Day labels -->
        <text
          v-for="(label, i) in DAY_LABELS"
          :key="'day-' + i"
          :x="0"
          :y="i * TOTAL + CELL_SIZE + 20"
          class="fill-muted text-[10px]"
        >
          {{ label }}
        </text>

        <g transform="translate(30, 0)">
          <!-- Month labels -->
          <text
            v-for="ml in monthLabels"
            :key="'month-' + ml.label + ml.x"
            :x="ml.x"
            :y="12"
            class="fill-muted text-[10px]"
          >
            {{ ml.label }}
          </text>

          <!-- Cells -->
          <rect
            v-for="cell in heatmapCells"
            :key="cell.day.date"
            :x="cell.x"
            :y="cell.y + 18"
            :width="CELL_SIZE"
            :height="CELL_SIZE"
            :fill="cell.color"
            rx="3"
            class="cursor-pointer transition-opacity hover:opacity-80"
            @mouseenter="onCellHover(cell, $event)"
            @mouseleave="onCellLeave"
          />
        </g>
      </svg>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-end gap-1.5 text-xs text-muted">
      <span>Menos</span>
      <span
        v-for="level in [0, 1, 2, 3, 4]"
        :key="level"
        class="inline-block size-3 rounded-sm"
        :style="{ backgroundColor: LEVEL_COLORS[level] }"
      />
      <span>Mais</span>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipCell"
        class="pointer-events-none fixed z-50 rounded-lg border border-default bg-elevated px-3 py-2 text-sm shadow-lg"
        :style="{
          left: tooltipPos.x + 12 + 'px',
          top: tooltipPos.y - 40 + 'px'
        }"
      >
        <p class="font-medium text-highlighted">{{ tooltipCell.day.count }} concluídos</p>
        <p class="text-xs text-muted">{{ formatDate(tooltipCell.day.date) }}</p>
      </div>
    </Teleport>
  </div>
</template>
