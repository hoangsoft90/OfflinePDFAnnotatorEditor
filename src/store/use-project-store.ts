/**
 * Project store (annotation/model spec) — holds one Project per document,
 * keyed by docId, plus page metadata for identity mapping.
 */
import { create } from 'zustand';

import type { Project } from '@/models/project';
import type { PageMeta } from '@/models/page';

interface ProjectState {
  /** docId -> Project */
  projects: Record<string, Project>;
  /** docId -> page metadata indexed by page position (derived from pageOrder) */
  pageMetas: Record<string, Record<string, PageMeta>>;
  setProject: (docId: string, project: Project) => void;
  updateProject: (docId: string, patch: Partial<Project>) => void;
  setPageMetas: (docId: string, metas: Record<string, PageMeta>) => void;
  markDirty: (docId: string, dirty?: boolean) => void;
  clear: (docId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: {},
  pageMetas: {},

  setProject: (docId, project) =>
    set((s) => ({ projects: { ...s.projects, [docId]: project } })),

  updateProject: (docId, patch) =>
    set((s) => {
      const existing = s.projects[docId];
      if (!existing) return s;
      return {
        projects: {
          ...s.projects,
          [docId]: { ...existing, ...patch, modifiedAt: new Date().toISOString() },
        },
      };
    }),

  setPageMetas: (docId, metas) =>
    set((s) => ({ pageMetas: { ...s.pageMetas, [docId]: metas } })),

  markDirty: (docId, dirty = true) =>
    set((s) => {
      const existing = s.projects[docId];
      if (!existing) return s;
      return {
        projects: {
          ...s.projects,
          [docId]: {
            ...existing,
            dirty,
            revision: dirty ? existing.revision + 1 : existing.revision,
            modifiedAt: new Date().toISOString(),
          },
        },
      };
    }),

  clear: (docId) =>
    set((s) => {
      const projects = { ...s.projects };
      const pageMetas = { ...s.pageMetas };
      delete projects[docId];
      delete pageMetas[docId];
      return { projects, pageMetas };
    }),
}));
