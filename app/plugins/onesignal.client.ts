export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    void useOneSignal().bootstrap()
  })
})
