/**
 * Annotation store (annotation/model spec) — flat map of annotations keyed by
 * id, with pageId references. Immutable updates so React re-renders are cheap.
 */
import { create } from 'zustand';

import type { Annotation } from '@/models/annotation';
import type { PageId } from '@/models/page';

interface AnnotationState {
  /** docId -> (annotationId -> Annotation) */
  byDoc: Record<string, Record<string, Annotation>>;
  /** Adds or replaces an annotation for a doc. */
  setAnnotation: (docId: string, annotation: Annotation) => void;
  /** Removes an annotation. */
  removeAnnotation: (docId: string, annotationId: string) => void;
  /** All annotations for a doc. */
  forDoc: (docId: string) => Annotation[];
  /** Annotations for a page of a doc. */
  forPage: (docId: string, pageId: PageId) => Annotation[];
  /** Clears all annotations for a doc. */
  clearDoc: (docId: string) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  byDoc: {},

  setAnnotation: (docId, annotation) =>
    set((s) => {
      const docAnns = s.byDoc[docId] ?? {};
      return {
        byDoc: {
          ...s.byDoc,
          [docId]: { ...docAnns, [annotation.id]: annotation },
        },
      };
    }),

  removeAnnotation: (docId, annotationId) =>
    set((s) => {
      const docAnns = s.byDoc[docId];
      if (!docAnns || !docAnns[annotationId]) return s;
      const next = { ...docAnns };
      delete next[annotationId];
      return { byDoc: { ...s.byDoc, [docId]: next } };
    }),

  forDoc: (docId) => {
    const docAnns = get().byDoc[docId] ?? {};
    return Object.values(docAnns);
  },

  forPage: (docId, pageId) => {
    const docAnns = get().byDoc[docId] ?? {};
    return Object.values(docAnns).filter((a) => a.pageId === pageId);
  },

  clearDoc: (docId) =>
    set((s) => {
      if (!s.byDoc[docId]) return s;
      const byDoc = { ...s.byDoc };
      delete byDoc[docId];
      return { byDoc };
    }),
}));
