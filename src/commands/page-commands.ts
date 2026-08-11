/**
 * Page operation commands (pages/organizer spec, ADR-007).
 * All operate on the pageOrder (pageIds) — annotations stay attached.
 */
import type { Command, CommandPayload } from '@/commands/types';
import { moveInOrder, removeIndexes, type PageOrder } from '@/models/page';
import { useProjectStore } from '@/store/use-project-store';
import { useAnnotationStore } from '@/store/use-annotation-store';
import { markDocDirty } from '@/journal/autosave';

function getOrder(docId: string): PageOrder {
  return useProjectStore.getState().projects[docId]?.pageOrder ?? [];
}

export class ReorderPagesCommand implements Command {
  type = 'ReorderPages' as const;
  private before: PageOrder;

  constructor(
    private readonly docId: string,
    private readonly from: number,
    private readonly to: number
  ) {
    this.before = getOrder(docId);
  }

  execute() {
    const after = moveInOrder(this.before, this.from, this.to);
    useProjectStore.getState().updateProject(this.docId, { pageOrder: after });
    markDocDirty(this.docId);
  }

  undo() {
    useProjectStore.getState().updateProject(this.docId, { pageOrder: this.before });
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, pageOrderBefore: this.before, pageOrderAfter: moveInOrder(this.before, this.from, this.to), ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return this.toPayload();
  }

  inverseEffect(): CommandPayload {
    return { ...this.toPayload(), type: 'ReorderPages', pageOrderBefore: this.toPayload().pageOrderAfter, pageOrderAfter: this.before, ts: new Date().toISOString() };
  }
}

export class RotatePageCommand implements Command {
  type = 'RotatePage' as const;
  private before: Record<string, 0 | 90 | 180 | 270>;

  constructor(
    private readonly docId: string,
    private readonly pageId: string,
    private readonly rotation: 0 | 90 | 180 | 270
  ) {
    this.before = { ...(useProjectStore.getState().projects[docId]?.pageRotations ?? {}) };
  }

  execute() {
    const rotations = { ...this.before, [this.pageId]: this.rotation };
    useProjectStore.getState().updateProject(this.docId, { pageRotations: rotations });
    markDocDirty(this.docId);
  }

  undo() {
    useProjectStore.getState().updateProject(this.docId, { pageRotations: this.before });
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, pageId: this.pageId, rotation: this.rotation, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return this.toPayload();
  }

  inverseEffect(): CommandPayload {
    return { ...this.toPayload(), rotation: this.before[this.pageId] ?? 0, ts: new Date().toISOString() };
  }
}

export class DeletePagesCommand implements Command {
  type = 'DeletePages' as const;
  private before: PageOrder;
  private removedAnnotations: { id: string }[] = [];

  constructor(
    private readonly docId: string,
    private readonly indexes: number[]
  ) {
    this.before = getOrder(docId);
  }

  execute() {
    const removedIds = this.indexes.map((i) => this.before[i]).filter(Boolean);
    const store = useAnnotationStore.getState();
    for (const pageId of removedIds) {
      for (const a of store.forPage(this.docId, pageId)) {
        this.removedAnnotations.push({ id: a.id });
        store.removeAnnotation(this.docId, a.id);
      }
    }
    useProjectStore.getState().updateProject(this.docId, { pageOrder: removeIndexes(this.before, this.indexes) });
    markDocDirty(this.docId);
  }

  undo() {
    // Annotations for deleted pages are re-added via journal replay (they are
    // stored as AddAnnotation effects); here we only restore the page order.
    useProjectStore.getState().updateProject(this.docId, { pageOrder: this.before });
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, pageOrderBefore: this.before, pageOrderAfter: removeIndexes(this.before, this.indexes), meta: { indexes: this.indexes }, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return this.toPayload();
  }

  inverseEffect(): CommandPayload {
    return { ...this.toPayload(), type: 'ReorderPages', pageOrderBefore: this.toPayload().pageOrderAfter, pageOrderAfter: this.before, ts: new Date().toISOString() };
  }
}

export class ExtractPagesCommand implements Command {
  type = 'ExtractPages' as const;
  private before: PageOrder;

  constructor(
    private readonly docId: string,
    private readonly indexes: number[]
  ) {
    this.before = getOrder(docId);
  }

  execute() {
    // Extraction does not mutate the source doc's pageOrder; it only creates
    // a new exported document (handled by the extract service). Keep a no-op
    // execute so undo is a no-op too (the exported file is separate).
    markDocDirty(this.docId);
  }

  undo() {
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, pageOrderBefore: this.before, meta: { indexes: this.indexes }, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return this.toPayload();
  }

  inverseEffect(): CommandPayload {
    return this.toPayload();
  }
}
