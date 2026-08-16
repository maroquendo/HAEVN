/**
 * HAEVN Media Cache & Offline Storage Service
 * 
 * Manages on-device offline video storage for iPad (Safari), Android, and desktop browsers.
 * Enforces automatic LRU (Least Recently Used) eviction and 7-day TTL cleanup to ensure
 * the cache NEVER consumes excessive storage on the user's device.
 */

const DB_NAME = 'haevn_media_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'cached_videos';

// Configurable Storage Quota
export const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB maximum storage cap
export const MAX_CACHE_VIDEOS = 15; // Maximum 15 videos cached at a time
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days expiration

export interface CachedVideoEntry {
    videoId: string;
    title: string;
    blob: Blob;
    mimeType: string;
    sizeBytes: number;
    cachedAt: number;
    lastAccessedAt: number;
}

export interface CacheStats {
    totalBytes: number;
    totalVideos: number;
    formattedSize: string;
    usagePercent: number;
}

// Open or initialize IndexedDB
const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB is not supported in this browser.'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
                store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
                store.createIndex('cachedAt', 'cachedAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Cache a video by downloading its clean stream into IndexedDB
 */
export const cacheVideo = async (videoId: string, streamUrl: string, title: string): Promise<string> => {
    try {
        // 1. Fetch the media stream as a Blob
        const response = await fetch(streamUrl, {
            mode: 'cors',
            headers: { 'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch video stream: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const mimeType = blob.type || 'video/mp4';
        const sizeBytes = blob.size;
        const now = Date.now();

        const entry: CachedVideoEntry = {
            videoId,
            title,
            blob,
            mimeType,
            sizeBytes,
            cachedAt: now,
            lastAccessedAt: now
        };

        // 2. Perform LRU eviction if needed before writing
        await evictCacheIfNeeded(sizeBytes);

        // 3. Save to IndexedDB
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(entry);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });

        return URL.createObjectURL(blob);
    } catch (error) {
        console.warn(`[MediaCache] Failed to cache video ${videoId}:`, error);
        throw error;
    }
};

/**
 * Get an offline playable blob URL for a cached video
 */
export const getCachedVideoUrl = async (videoId: string): Promise<string | null> => {
    try {
        const db = await openDatabase();
        const entry = await new Promise<CachedVideoEntry | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(videoId);

            req.onsuccess = () => {
                const result = req.result as CachedVideoEntry | undefined;
                if (result) {
                    // Update last accessed time for LRU tracking
                    result.lastAccessedAt = Date.now();
                    store.put(result);
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => reject(req.error);
        });

        if (entry && entry.blob) {
            return URL.createObjectURL(entry.blob);
        }
        return null;
    } catch (error) {
        console.warn(`[MediaCache] Could not retrieve cached video ${videoId}:`, error);
        return null;
    }
};

/**
 * Check if a video is available offline
 */
export const isVideoCached = async (videoId: string): Promise<boolean> => {
    try {
        const db = await openDatabase();
        return await new Promise<boolean>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.count(videoId);
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => resolve(false);
        });
    } catch (e) {
        return false;
    }
};

/**
 * Delete a specific cached video
 */
export const removeCachedVideo = async (videoId: string): Promise<void> => {
    try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(videoId);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[MediaCache] Error removing video ${videoId}:`, e);
    }
};

/**
 * Clear all cached video files
 */
export const clearAllMediaCache = async (): Promise<void> => {
    try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        console.log('[MediaCache] Media cache completely cleared.');
    } catch (e) {
        console.warn('[MediaCache] Error clearing cache:', e);
    }
};

/**
 * Calculate total cache usage statistics
 */
export const getCacheStorageStats = async (): Promise<CacheStats> => {
    try {
        const db = await openDatabase();
        const entries = await new Promise<CachedVideoEntry[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });

        const totalBytes = entries.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
        const totalVideos = entries.length;
        const formattedSize = formatBytes(totalBytes);
        const usagePercent = Math.min(100, Math.round((totalBytes / MAX_CACHE_BYTES) * 100));

        return {
            totalBytes,
            totalVideos,
            formattedSize,
            usagePercent
        };
    } catch (e) {
        return {
            totalBytes: 0,
            totalVideos: 0,
            formattedSize: '0 MB',
            usagePercent: 0
        };
    }
};

/**
 * LRU & TTL Eviction Algorithm
 * Automatically deletes oldest / expired videos when approaching storage quota
 */
export const evictCacheIfNeeded = async (incomingBytes: number = 0): Promise<void> => {
    try {
        const db = await openDatabase();
        const entries = await new Promise<CachedVideoEntry[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });

        if (entries.length === 0) return;

        const now = Date.now();
        let totalBytes = entries.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);

        // 1. Evict expired entries older than 7 days
        const expired = entries.filter(e => (now - e.cachedAt) > CACHE_TTL_MS);
        for (const exp of expired) {
            await removeCachedVideo(exp.videoId);
            totalBytes -= exp.sizeBytes;
        }

        // 2. If still exceeding MAX_CACHE_BYTES or MAX_CACHE_VIDEOS, evict LRU (Least Recently Used)
        const remaining = entries
            .filter(e => !expired.some(x => x.videoId === e.videoId))
            .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt); // Oldest accessed first

        while (
            remaining.length > 0 &&
            (totalBytes + incomingBytes > MAX_CACHE_BYTES || remaining.length >= MAX_CACHE_VIDEOS)
        ) {
            const toEvict = remaining.shift();
            if (toEvict) {
                console.log(`[MediaCache] Auto-evicting LRU video: ${toEvict.title} (${formatBytes(toEvict.sizeBytes)})`);
                await removeCachedVideo(toEvict.videoId);
                totalBytes -= toEvict.sizeBytes;
            }
        }
    } catch (e) {
        console.warn('[MediaCache] Eviction check failed:', e);
    }
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
};
