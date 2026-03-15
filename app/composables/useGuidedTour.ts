import type { Config, DriveStep, Driver } from 'driver.js'
import type { GuidedToursResponse } from '~/types/guided-tour'

type GuidedToursState = {
  loaded: boolean
  loading: boolean
  tours: GuidedToursResponse['tours']
}

type GuidedTourOptions = {
  completeOnClose?: boolean
  config?: Config
  key: string
  onDestroyed?: () => void | Promise<void>
  steps: DriveStep[]
  waitTimeoutMs?: number
}

function isElementAvailable(step: DriveStep): boolean {
  if (!step.element)
    return true

  if (typeof step.element === 'string')
    return Boolean(document.querySelector(step.element))

  if (typeof step.element === 'function')
    return Boolean(step.element())

  return Boolean(step.element)
}

async function waitForStep(step: DriveStep | undefined, timeoutMs: number) {
  if (!step)
    return

  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (isElementAvailable(step))
      return

    await new Promise(resolve => setTimeout(resolve, 120))
  }
}

export function useGuidedTour() {
  const state = useState<GuidedToursState>('guided-tours', () => ({
    loaded: false,
    loading: false,
    tours: {}
  }))

  async function load(force = false) {
    if (state.value.loading)
      return

    if (state.value.loaded && !force)
      return

    state.value.loading = true

    try {
      const response = await $fetch<GuidedToursResponse>('/api/settings/guided-tours')
      state.value.tours = response.tours
      state.value.loaded = true
    } catch {
      state.value.loaded = true
    } finally {
      state.value.loading = false
    }
  }

  function isCompleted(key: string) {
    return Boolean(state.value.tours[key]?.completed)
  }

  async function setCompleted(key: string, completed = true) {
    state.value.tours = {
      ...state.value.tours,
      [key]: {
        completed,
        completedAt: completed ? new Date().toISOString() : null
      }
    }

    await $fetch<GuidedToursResponse>('/api/settings/guided-tours', {
      body: { completed, key },
      method: 'PUT'
    }).then((response) => {
      state.value.tours = response.tours
      state.value.loaded = true
    }).catch(() => {})
  }

  async function createGuidedTour(options: GuidedTourOptions) {
    if (import.meta.server)
      return null

    const { driver } = await import('driver.js')
    const userConfig = options.config ?? {}
    let shouldPersistCompletion = false

    const driverInstance = driver({
      allowClose: true,
      allowKeyboardControl: true,
      animate: true,
      doneBtnText: userConfig.doneBtnText ?? 'Concluir',
      nextBtnText: userConfig.nextBtnText ?? 'Próximo',
      overlayClickBehavior: userConfig.overlayClickBehavior ?? ((_element, _step, { driver }) => {
        if (options.completeOnClose !== false)
          shouldPersistCompletion = true

        driver.destroy()
      }),
      overlayColor: 'rgba(2, 6, 24, 0.74)',
      popoverClass: 'kortex-guided-tour',
      prevBtnText: userConfig.prevBtnText ?? 'Anterior',
      progressText: userConfig.progressText ?? '{{current}} de {{total}}',
      showButtons: ['previous', 'next', 'close'],
      showProgress: true,
      smoothScroll: true,
      ...userConfig,
      onCloseClick: (element, step, context) => {
        if (options.completeOnClose !== false)
          shouldPersistCompletion = true

        userConfig.onCloseClick?.(element, step, context)

        if (!context.driver.isActive())
          return

        context.driver.destroy()
      },
      onDestroyed: (element, step, context) => {
        userConfig.onDestroyed?.(element, step, context)

        if (shouldPersistCompletion)
          void setCompleted(options.key)

        void options.onDestroyed?.()
      },
      onNextClick: (element, step, context) => {
        userConfig.onNextClick?.(element, step, context)

        if (!context.driver.isActive())
          return

        if (context.driver.isLastStep())
          shouldPersistCompletion = true

        context.driver.moveNext()
      },
      steps: options.steps
    })

    return driverInstance
  }

  async function startIfNeeded(options: GuidedTourOptions): Promise<Driver | null> {
    await load()

    if (isCompleted(options.key))
      return null

    await nextTick()
    await waitForStep(options.steps[0], options.waitTimeoutMs ?? 4000)

    const driverInstance = await createGuidedTour(options)
    if (!driverInstance)
      return null

    driverInstance.drive()
    return driverInstance
  }

  return {
    createGuidedTour,
    isCompleted,
    load,
    setCompleted,
    startIfNeeded,
    state: readonly(state)
  }
}
