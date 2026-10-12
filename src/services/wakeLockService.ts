/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Screen Wake Lock Service:
 * Prevents mobile devices (iOS Safari, Android Chrome, mobile browsers)
 * from dimming the screen or going to sleep during long voice conversations.
 */

class ScreenWakeLockService {
  private static instance: ScreenWakeLockService;
  private wakeLockSentinel: any = null;
  private isRequested = false;
  private isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  private constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          // Re-acquire wake lock after user switches back to the tab
          this.acquireLock();
        }
      });
    }
  }

  public static getInstance(): ScreenWakeLockService {
    if (!ScreenWakeLockService.instance) {
      ScreenWakeLockService.instance = new ScreenWakeLockService();
    }
    return ScreenWakeLockService.instance;
  }

  /**
   * Request screen wake lock to keep screen active
   */
  public async acquireLock(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported) {
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }

      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

      this.wakeLockSentinel.addEventListener('release', () => {
        // If release was not requested by us and session is still active, re-acquire
        if (this.isRequested && document.visibilityState === 'visible') {
          setTimeout(() => {
            if (this.isRequested) this.acquireLock();
          }, 500);
        }
      });

      console.log('[Amico WakeLock] Verrou d’écran actif (veille désactivée pour la conversation vocale)');
      return true;
    } catch (err: any) {
      console.warn('[Amico WakeLock] Impossible d’activer le WakeLock (autorisé uniquement sur HTTPS ou action utilisateur):', err?.message);
      return false;
    }
  }

  /**
   * Release wake lock when conversation ends
   */
  public async releaseLock(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (e) {}
      this.wakeLockSentinel = null;
    }
    console.log('[Amico WakeLock] Verrou d’écran relâché');
  }

  public isLockActive(): boolean {
    return !!(this.wakeLockSentinel && !this.wakeLockSentinel.released);
  }
}

export const wakeLockService = ScreenWakeLockService.getInstance();
