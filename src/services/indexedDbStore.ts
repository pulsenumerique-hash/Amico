/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Robust IndexedDB Storage for Amico:
 * - Session resumption tokens for multi-hour sessions
 * - Persistent memory & offline conversation logs for PWA / Android
 * - Transparent fallback to localStorage if IndexedDB is unavailable
 */

const DB_NAME = 'amico_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'amico_keyval';

class IndexedDbStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = window.indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            console.warn('[Amico DB] IndexedDB unavailable, falling back to localStorage');
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  public async get<T>(key: string): Promise<T | null> {
    const db = await this.getDB();
    if (!db) {
      try {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : null;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => {
          try {
            const item = localStorage.getItem(key);
            resolve(item ? (JSON.parse(item) as T) : null);
          } catch {
            resolve(null);
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  public async set<T>(key: string, value: T): Promise<void> {
    // Write to localStorage as mirror
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {}

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const indexedDbStore = new IndexedDbStore();
