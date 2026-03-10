<script setup lang="ts">
import type { WeeklyRate } from '~/types/habits'

const props = defineProps<{
  rates: WeeklyRate[]
}>()

const maxRate = computed(() => Math.max(...props.rates.map(r => r.rate), 1))

const tooltipData = ref<{ rate: WeeklyRate, x: number, y: number } | null>(null)

function onBarHover(rate: WeeklyRate, event: MouseEvent) {
  tooltipData.value = { rate, x: event.clientX, y: event.clientY }
}

function onBarLeave() {
  tooltipData.value = null
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-end gap-1 h-32">
      <div
        v-for="(rate, i) in rates"
        :key="i"
        class="flex-1 flex flex-col items-center justify-end h-full"
      >
        <div
          class="w-full max-w-[20px] rounded-t-sm transition-all duration-200 cursor-pointer hover:opacity-80"
          :style="{
            height: `${Math.max((rate.rate / maxRate) * 100, 4)}%`,
            backgroundColor: rate.rate >= 75
              ? 'var(--ui-primary)'
              : rate.rate >= 50
                ? 'color-mix(in srgb, var(--ui-primary) 60%, transparent)'
                : rate.rate >= 25
                  ? 'color-mix(in srgb, var(--ui-primary) 35%, transparent)'
                  : 'var(--ui-border)'
          }"
          @mouseenter="onBarHover(rate, $event)"
          @mouseleave="onBarLeave"
        />
      </div>
    </div>

    <!-- X-axis labels (show every N labels to avoid overlap) -->
    <div class="flex gap-1">
      <div
        v-for="(rate, i) in rates"
        :key="i"
        class="flex-1 text-center"
      >
        <span
          v-if="i % Math.ceil(rates.length / 8) === 0 || i === rates.length - 1"
          class="text-[9px] text-muted truncate block"
        >
          {{ rate.week }}
        </span>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipData"
        class="pointer-events-none fixed z-50 rounded-lg border border-default bg-elevated px-3 py-2 text-sm shadow-lg"
        :style="{
          left: tooltipData.x + 12 + 'px',
          top: tooltipData.y - 40 + 'px'
        }"
      >
        <p class="font-medium text-highlighted">{{ tooltipData.rate.rate }}%</p>
        <p class="text-xs text-muted">Semana de {{ tooltipData.rate.week }}</p>
      </div>
    </Teleport>
  </div>
</template>
