/**
 * Device detection utility — mobile vs desktop, OS type, screen size, model.
 * Pure functions, no dependencies. Use in preview or project apps.
 */
const MOBILE_UA = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i;
const ANDROID_MODEL = /Android\s+[\d.]+;\s*([^)]+)/;
function detectIsMobile() {
    if (typeof window === 'undefined')
        return false;
    const ua = navigator.userAgent;
    const uaData = navigator.userAgentData;
    if (uaData?.mobile !== undefined) {
        return uaData.mobile;
    }
    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer:coarse)').matches) {
        return true;
    }
    return MOBILE_UA.test(ua);
}
function detectOs(ua, isMobile) {
    if (/iPhone|iPod/i.test(ua))
        return 'iphone';
    if (/iPad/i.test(ua))
        return 'ipad';
    // iPad on iOS 13+ reports as Mac — check touch + Mac UA
    if (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
        return 'ipad';
    if (/Android/i.test(ua))
        return 'android';
    if (!isMobile)
        return 'desktop';
    return 'unknown';
}
function detectModel(ua, os) {
    if (os === 'android') {
        const m = ua.match(ANDROID_MODEL);
        if (m?.[1])
            return m[1].trim();
    }
    return null;
}
/**
 * Returns device info: mobile/desktop, OS type, screen size, viewport, model.
 */
export function getDeviceInfo() {
    const isMobile = detectIsMobile();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const os = detectOs(ua, isMobile);
    const model = detectModel(ua, os);
    const screen = typeof window !== 'undefined'
        ? { width: window.screen.width, height: window.screen.height }
        : { width: 0, height: 0 };
    const viewport = typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 0, height: 0 };
    return {
        isMobile,
        os,
        screen,
        viewport,
        model,
    };
}
/**
 * Returns true if the device is mobile (phone/tablet), false for desktop.
 */
export function isMobileDevice() {
    return getDeviceInfo().isMobile;
}
