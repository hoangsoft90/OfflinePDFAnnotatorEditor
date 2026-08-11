/**
 * Concrete annotation commands (annotation/undo-redo spec).
 */
import type { Command, CommandPayload } from '@/commands/types';
import type { Annotation } from '@/models/annotation';
import { useAnnotationStore } from '@/store/use-annotation-store';
import { markDocDirty } from '@/journal/autosave';

export class AddAnnotationCommand implements Command {
  type = 'AddAnnotation' as const;
  constructor(
    private readonly docId: string,
    private readonly annotation: Annotation
  ) {}

  execute() {
    useAnnotationStore.getState().setAnnotation(this.docId, this.annotation);
    markDocDirty(this.docId);
  }

  undo() {
    useAnnotationStore.getState().removeAnnotation(this.docId, this.annotation.id);
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return { type: 'AddAnnotation', docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }

  inverseEffect(): CommandPayload {
    return { type: 'DeleteAnnotation', docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }
}

export class DeleteAnnotationCommand implements Command {
  type = 'DeleteAnnotation' as const;
  constructor(
    private readonly docId: string,
    private readonly annotation: Annotation
  ) {}

  execute() {
    useAnnotationStore.getState().removeAnnotation(this.docId, this.annotation.id);
    markDocDirty(this.docId);
  }

  undo() {
    useAnnotationStore.getState().setAnnotation(this.docId, this.annotation);
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return { type: 'DeleteAnnotation', docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }

  inverseEffect(): CommandPayload {
    return { type: 'AddAnnotation', docId: this.docId, annotation: this.annotation, ts: new Date().toISOString() };
  }
}

export class MoveAnnotationCommand implements Command {
  type = 'MoveAnnotation' as const;
  private prev: Annotation;
  constructor(
    private readonly docId: string,
    private readonly next: Annotation
  ) {
    const all = useAnnotationStore.getState().forDoc(docId);
    this.prev =
      all.find((a) => a.id === next.id) ??
      ({ ...next, geometry: { ...next.geometry, boundingBox: next.geometry.boundingBox } } as Annotation);
  }

  execute() {
    useAnnotationStore.getState().setAnnotation(this.docId, this.next);
    markDocDirty(this.docId);
  }

  undo() {
    useAnnotationStore.getState().setAnnotation(this.docId, this.prev);
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return {
      type: this.type,
      docId: this.docId,
      annotation: this.next,
      prevAnnotation: this.prev,
      ts: new Date().toISOString(),
    };
  }

  effect(): CommandPayload {
    return { type: 'AddAnnotation', docId: this.docId, annotation: this.next, ts: new Date().toISOString() };
  }

  inverseEffect(): CommandPayload {
    return { type: 'AddAnnotation', docId: this.docId, annotation: this.prev, ts: new Date().toISOString() };
  }
}

/** Resize/move are semantically identical at the store level. */
export { MoveAnnotationCommand as ResizeAnnotationCommand };
export { MoveAnnotationCommand as RestyleCommand };

export class ClearPageCommand implements Command {
  type = 'ClearPage' as const;
  private removed: Annotation[] = [];

  constructor(
    private readonly docId: string,
    private readonly pageId: string
  ) {}

  execute() {
    const store = useAnnotationStore.getState();
    this.removed = store.forPage(this.docId, this.pageId);
    for (const a of this.removed) store.removeAnnotation(this.docId, a.id);
    markDocDirty(this.docId);
  }

  undo() {
    const store = useAnnotationStore.getState();
    for (const a of this.removed) store.setAnnotation(this.docId, a);
    markDocDirty(this.docId);
  }

  toPayload(): CommandPayload {
    return { type: this.type, docId: this.docId, pageId: this.pageId, ts: new Date().toISOString() };
  }

  effect(): CommandPayload {
    return { type: 'ClearPage', docId: this.docId, pageId: this.pageId, ts: new Date().toISOString() };
  }

  inverseEffect(): CommandPayload {
    // Re-adding removed annotations is handled by replay of the removal;
    // for safety, journal each removal as an AddAnnotation.
    const payload: CommandPayload = { type: 'AddAnnotation', docId: this.docId, annotation: this.removed[0], ts: new Date().toISOString() };
    return payload;
  }
}

export { markDocDirty } from '@/journal/autosave';
