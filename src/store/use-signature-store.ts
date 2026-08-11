import { create } from 'zustand';

import type { Signature } from '@/models/signature';
import { signatureRepo } from '@/signatures/signature-repo';

interface SignatureState {
  signatures: Signature[];
  /** Selected signature for placement on the next tap */
  selectedForPlacement: Signature | null;
  refresh: () => void;
  add: (sig: Signature) => void;
  remove: (id: string) => void;
  selectForPlacement: (sig: Signature | null) => void;
}

export const useSignatureStore = create<SignatureState>((set, get) => ({
  signatures: signatureRepo.list(),
  selectedForPlacement: null,

  refresh: () => set({ signatures: signatureRepo.list() }),

  add: (sig) => set((s) => ({ signatures: [sig, ...s.signatures] })),

  remove: (id) => {
    signatureRepo.delete(id);
    set((s) => ({ signatures: s.signatures.filter((x) => x.id !== id) }));
  },

  selectForPlacement: (sig) => set({ selectedForPlacement: sig }),
}));
