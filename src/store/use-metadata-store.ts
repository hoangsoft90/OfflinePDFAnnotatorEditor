/**
 * Metadata store (files/recent spec) — recents, favorites, document rows.
 */
import { create } from 'zustand';

import type { MetadataRepo } from '@/db/metadata-repo';
import { cleanupForRemoval, clearThumbnailCache } from '@/storage/cleanup';
import type { Document } from '@/models/document';

interface MetadataState {
  repo: MetadataRepo | null;
  initialized: boolean;
  initError: string | null;
  recents: Document[];
  showFavoritesOnly: boolean;
  init: (repo: MetadataRepo) => Promise<void>;
  refresh: () => Promise<void>;
  setFavoritesOnly: (v: boolean) => void;
  upsert: (doc: Document) => Promise<void>;
  touch: (id: string, pageCount: number, modifiedAt: string) => Promise<void>;
  setFavorite: (id: string, favorite: boolean) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  removeFromRecents: (doc: Document) => Promise<void>;
  clearRecents: () => Promise<void>;
  getById: (id: string) => Promise<Document | null>;
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  repo: null,
  initialized: false,
  initError: null,
  recents: [],
  showFavoritesOnly: false,

  init: async (repo) => {
    try {
      const recents = await repo.listRecent();
      set({ repo, initialized: true, initError: null, recents });
    } catch (e) {
      set({ initError: e instanceof Error ? e.message : String(e) });
    }
  },

  refresh: async () => {
    const { repo, showFavoritesOnly } = get();
    if (!repo) return;
    const recents = showFavoritesOnly ? await repo.listFavorites() : await repo.listRecent();
    set({ recents });
  },

  setFavoritesOnly: (v) => {
    set({ showFavoritesOnly: v });
    void get().refresh();
  },

  upsert: async (doc) => {
    await get().repo?.upsert(doc);
    await get().refresh();
  },

  touch: async (id, pageCount, modifiedAt) => {
    await get().repo?.touch(id, pageCount, modifiedAt);
    await get().refresh();
  },

  setFavorite: async (id, favorite) => {
    await get().repo?.setFavorite(id, favorite);
    await get().refresh();
  },

  rename: async (id, name) => {
    await get().repo?.rename(id, name);
    await get().refresh();
  },

  removeFromRecents: async (doc) => {
    await get().repo?.remove(doc.id);
    cleanupForRemoval([doc]);
    await get().refresh();
  },

  clearRecents: async () => {
    await get().repo?.clearAll();
    clearThumbnailCache();
    await get().refresh();
  },

  getById: async (id) => get().repo?.getById(id) ?? null,
}));
