/**
 * Guidance copy registry — SINGLE source of truth for all in-app guidance
 * wording (in-app-guidance change, logic spec). Dev and UI Designer edit
 * copy here without touching components or integration sites.
 */

export interface SpotlightStepDef {
  title: string;
  description: string;
}

export interface HelperContentDef {
  /** What the feature does. */
  title?: string;
  /** Why it is unavailable right now. */
  why: string;
  /** How to unlock / what to do instead. */
  how?: string;
  /** Optional action button label (deep-link to the unlock location). */
  actionLabel?: string;
}

export interface GuidanceFeatureDef {
  kind: 'spotlight' | 'tooltip' | 'helper';
  /** Badge label shown while the feature is new. */
  badgeLabel?: string;
  /** Tooltip sentence (kind === 'tooltip'). */
  tooltip?: string;
  /** Spotlight steps (kind === 'spotlight'). */
  steps?: readonly SpotlightStepDef[];
  /** Contextual helper content (kind === 'helper'). */
  helper?: HelperContentDef;
}

export const GUIDANCE_FEATURES = {
  'annotation-intro': {
    kind: 'spotlight',
    badgeLabel: 'MỚI',
    steps: [
      {
        title: 'Công cụ ghi chú',
        description:
          'Chọn công cụ — Tô sáng, Bút, Chữ… — rồi kéo trên trang để vẽ. PDF gốc luôn an toàn.',
      },
      {
        title: 'Hoàn tác dễ dàng',
        description: 'Nhấn mũi tên cong để quay lại thao tác trước, bất cứ lúc nào.',
      },
    ],
  },
  'signature-create': {
    kind: 'tooltip',
    badgeLabel: 'MỚI',
    tooltip: 'Vẽ một lần, dùng mãi mãi.',
  },
  'undo-empty': {
    kind: 'helper',
    helper: {
      title: 'Hoàn tác',
      why: 'Chưa có thao tác nào để hoàn tác.',
    },
  },
  'search-scanned': {
    kind: 'helper',
    helper: {
      title: 'Không tìm thấy kết quả',
      why: 'Bản scan không có lớp văn bản nên không thể tìm chữ.',
      how: 'Dùng công cụ Tô sáng để đánh dấu thủ công.',
    },
  },
} as const;

export type GuidanceFeatureId = keyof typeof GUIDANCE_FEATURES;

export function getFeatureDef(id: GuidanceFeatureId): GuidanceFeatureDef {
  return GUIDANCE_FEATURES[id];
}
