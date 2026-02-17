/** Proto preview injects default params before the app loads. */
declare global {
  interface Window {
    __PROTO_PARAMS__?: Record<string, unknown>
  }
}

export {}
