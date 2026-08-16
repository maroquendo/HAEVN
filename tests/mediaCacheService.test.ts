// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory IndexedDB mock for Vitest jsdom environment
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: any = null;
  onerror: any = null;
  readyState = 'done';
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: any = null;
}

const mockStoreData = new Map<string, any>();

const mockStore = {
  get: (key: string) => {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = mockStoreData.get(key);
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  getAll: () => {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = Array.from(mockStoreData.values());
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  put: (value: any) => {
    const req = new MockIDBRequest();
    mockStoreData.set(value.videoId, value);
    setTimeout(() => {
      req.result = value.videoId;
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  delete: (key: string) => {
    const req = new MockIDBRequest();
    mockStoreData.delete(key);
    setTimeout(() => {
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  count: (key: string) => {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = mockStoreData.has(key) ? 1 : 0;
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  clear: () => {
    const req = new MockIDBRequest();
    mockStoreData.clear();
    setTimeout(() => {
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
  createIndex: vi.fn()
};

const mockTransaction = {
  objectStore: () => mockStore
};

const mockDB = {
  objectStoreNames: {
    contains: () => true
  },
  transaction: () => mockTransaction,
  createObjectStore: () => mockStore
};

global.indexedDB = {
  open: () => {
    const req = new MockIDBOpenDBRequest();
    setTimeout(() => {
      req.result = mockDB;
      req.onsuccess?.({ target: req });
    }, 0);
    return req as any;
  }
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => `blob:http://localhost/${Date.now()}`);

import {
  cacheVideo,
  getCachedVideoUrl,
  isVideoCached,
  removeCachedVideo,
  clearAllMediaCache,
  getCacheStorageStats,
  MAX_CACHE_BYTES,
  MAX_CACHE_VIDEOS
} from '../services/mediaCacheService';

describe('HAEVN Media Cache & Offline Storage Service', () => {
  beforeEach(async () => {
    mockStoreData.clear();
  });

  it('calculates empty cache stats correctly', async () => {
    const stats = await getCacheStorageStats();
    expect(stats.totalBytes).toBe(0);
    expect(stats.totalVideos).toBe(0);
    expect(stats.formattedSize).toBe('0 MB');
    expect(stats.usagePercent).toBe(0);
  });

  it('tracks isVideoCached accurately after cache and removal', async () => {
    const fakeBlob = new Blob(['mock video data of 100 bytes length for testing'], { type: 'video/mp4' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(fakeBlob)
    });

    const isBefore = await isVideoCached('vid_123');
    expect(isBefore).toBe(false);

    await cacheVideo('vid_123', 'http://localhost:9123/media/test.mp4', 'Test Video');

    const isAfter = await isVideoCached('vid_123');
    expect(isAfter).toBe(true);

    const stats = await getCacheStorageStats();
    expect(stats.totalVideos).toBe(1);
    expect(stats.totalBytes).toBe(fakeBlob.size);

    await removeCachedVideo('vid_123');
    const isAfterDelete = await isVideoCached('vid_123');
    expect(isAfterDelete).toBe(false);
  });

  it('clears all media cache on clearAllMediaCache', async () => {
    const fakeBlob = new Blob(['sample data'], { type: 'video/mp4' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(fakeBlob)
    });

    await cacheVideo('vid_1', 'http://localhost/1', 'Video 1');
    await cacheVideo('vid_2', 'http://localhost/2', 'Video 2');

    let stats = await getCacheStorageStats();
    expect(stats.totalVideos).toBe(2);

    await clearAllMediaCache();
    stats = await getCacheStorageStats();
    expect(stats.totalVideos).toBe(0);
    expect(stats.totalBytes).toBe(0);
  });
});
