/**
 * Device detection utility — mobile vs desktop, OS type, screen size, model.
 * Pure functions, no dependencies. Use in preview or project apps.
 */

export type DeviceOs = 'iphone' | 'ipad' | 'android' | 'desktop' | 'unknown'

export interface ScreenSize {
  width: number
  height: number
}

export interface DeviceInfo {
  /** Mobile phone/tablet vs desktop */
  isMobile: boolean
  /** Device type: iPhone, iPad, Android, Desktop or Unknown */
  os: DeviceOs
  /** Screen resolution (screen.width / screen.height) */
  screen: ScreenSize
  /** Current viewport (innerWidth / innerHeight) at call time */
  viewport: ScreenSize
  /** Device model if detectable (e.g. "Pixel 7", "SM-G998B"), null otherwise */
  model: string | null
}

const MOBILE_UA =
  /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i
const ANDROID_MODEL = /Android\s+[\d.]+;\s*([^)]+)/

interface NavigatorUAData {
  mobile?: boolean
}

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData
  if (uaData?.mobile !== undefined) {
    return uaData.mobile
  }
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer:coarse)').matches) {
    return true
  }
  return MOBILE_UA.test(ua)
}

function detectOs(ua: string, isMobile: boolean): DeviceOs {
  if (/iPhone|iPod/i.test(ua)) return 'iphone'
  if (/iPad/i.test(ua)) return 'ipad'
  // iPad on iOS 13+ reports as Mac — check touch + Mac UA
  if (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
    return 'ipad'
  if (/Android/i.test(ua)) return 'android'
  if (!isMobile) return 'desktop'
  return 'unknown'
}

function detectModel(ua: string, os: DeviceOs): string | null {
  if (os === 'android') {
    const m = ua.match(ANDROID_MODEL)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

/**
 * Returns device info: mobile/desktop, OS type, screen size, viewport, model.
 */
export function getDeviceInfo(): DeviceInfo {
  const isMobile = detectIsMobile()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const os = detectOs(ua, isMobile)
  const model = detectModel(ua, os)

  const screen: ScreenSize =
    typeof window !== 'undefined'
      ? { width: window.screen.width, height: window.screen.height }
      : { width: 0, height: 0 }

  const viewport: ScreenSize =
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 }

  return {
    isMobile,
    os,
    screen,
    viewport,
    model,
  }
}

/**
 * Returns true if the device is mobile (phone/tablet), false for desktop.
 */
export function isMobileDevice(): boolean {
  return getDeviceInfo().isMobile
}
