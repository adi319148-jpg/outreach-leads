/**
 * Persistent Device Fingerprinting for Single-User Device Binding (1 Key = 1 Device)
 */

export function getDeviceId(): string {
  try {
    const STORAGE_KEY = 'outreach_device_id';
    let existingId = localStorage.getItem(STORAGE_KEY);
    if (existingId && existingId.length >= 16) {
      return existingId;
    }

    // Generate hardware-linked entropy
    const screenInfo = typeof window !== 'undefined' && window.screen 
      ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
      : '0x0';
    const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    
    // Generate secure random UUID
    let randomPart = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      randomPart = crypto.randomUUID();
    } else {
      randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Combine into a clean persistent identifier
    const newId = `DEV-${randomPart.toUpperCase()}-${btoa(`${screenInfo}_${timezone}_${cores}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}`;
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch (e) {
    return 'DEV-DEFAULT-DEVICE';
  }
}

export function getDeviceInfo(): string {
  try {
    if (typeof navigator === 'undefined') return 'Desktop Device';

    const ua = navigator.userAgent;
    let browser = 'Browser';
    let os = 'Device';

    // Detect OS
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Detect Browser
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

    const screenRes = typeof window !== 'undefined' && window.screen 
      ? `(${window.screen.width}x${window.screen.height})` 
      : '';

    return `${browser} on ${os} ${screenRes}`.trim();
  } catch (e) {
    return 'Web Client Device';
  }
}
