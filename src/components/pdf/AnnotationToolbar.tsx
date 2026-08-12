import { Ionicons } from '@expo/vector-icons';
import { useState, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCanRedo, useCanUndo, useCommandStack } from '@/commands/stack';
import { GuidanceBadge } from '@/guidance/components/GuidanceBadge';
import { GuidanceTooltip } from '@/guidance/components/GuidanceTooltip';
import { ContextualHelper } from '@/guidance/components/ContextualHelper';
import { getFeatureDef } from '@/guidance/registry';
import { useGuidance } from '@/guidance/use-guidance';
import { usePalette } from '@/store/use-theme-store';
import { useToolStore } from '@/store/use-tool-store';
import { TOOL_ORDER, type ToolId } from '@/tools/types';

const TOOL_ICONS: Record<ToolId, keyof typeof Ionicons.glyphMap> = {
  select: 'hand-left-outline',
  highlight: 'color-fill-outline',
  underline: 'remove-outline',
  strikeout: 'close-outline',
  pen: 'create-outline',
  eraser: 'close-circle-outline',
  text: 'text-outline',
  rectangle: 'square-outline',
  ellipse: 'ellipse-outline',
  line: 'remove-outline',
  arrow: 'arrow-forward-outline',
  signature: 'pencil-outline',
};

const TOOL_LABELS: Record<ToolId, string> = {
  select: 'Chọn',
  highlight: 'Tô màu',
  underline: 'Gạch chân',
  strikeout: 'Gạch ngang',
  pen: 'Bút',
  eraser: 'Tẩy',
  text: 'Chữ',
  rectangle: 'HCN',
  ellipse: 'Ellipse',
  line: 'Đường',
  arrow: 'Mũi tên',
  signature: 'Chữ ký',
};

interface Props {
  onOpenSignature?: () => void;
  /** Optional ref to the undo control (spotlight target measuring). */
  undoRef?: Ref<View>;
}

export function AnnotationToolbar({ onOpenSignature, undoRef }: Props) {
  const palette = usePalette();
  const { activeTool, setTool, color, setColor, opacity, setOpacity, strokeWidth, setStrokeWidth, pendingText, setPendingText } = useToolStore();
  const undo = useCommandStack((s) => s.undo);
  const redo = useCommandStack((s) => s.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const [showStyle, setShowStyle] = useState(false);

  // In-app guidance (in-app-guidance change): signature badge + first-tap
  // tooltip; undo contextual helper when the stack is empty.
  const sig = useGuidance('signature-create');
  const undoEmptyGuidance = useGuidance('undo-empty');
  const toolsIntro = useGuidance('annotation-intro');
  const sigDef = getFeatureDef('signature-create');
  const undoHelper = getFeatureDef('undo-empty').helper!;

  const handleToolPress = (tool: ToolId) => {
    if (tool === 'signature') {
      // First tap: teach (one-shot while unseen), then proceed to the picker.
      if (sig.state.status === 'unseen') sig.markShown('tooltip');
      sig.markUsed();
      onOpenSignature?.();
      return;
    }
    toolsIntro.markUsed();
    setTool(tool);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.backgroundElevated, borderTopColor: palette.border }]}>
      {/* Floating signature tooltip — sits over the toolbar's right side
          (signature is the rightmost tool); anchor mode would be clipped by
          the horizontal ScrollView on Android. */}
      <GuidanceTooltip
        visible={sig.showTooltip}
        text={sigDef.tooltip ?? ''}
        placement="top"
        align="right"
        onDismiss={sig.markDismissed}
        bubbleStyle={styles.sigTooltip}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
        {TOOL_ORDER.map((tool) => (
          <Pressable
            key={tool}
            onPress={() => handleToolPress(tool)}
            style={[styles.toolBtn, activeTool === tool && { backgroundColor: palette.backgroundSelected }]}>
            {tool === 'signature' && sig.showBadge ? <GuidanceBadge /> : null}
            <Ionicons
              name={TOOL_ICONS[tool]}
              size={20}
              color={activeTool === tool ? palette.primary : palette.textSecondary}
            />
            <ThemedText type="caption" color={activeTool === tool ? 'primary' : 'textSecondary'}>
              {TOOL_LABELS[tool]}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {activeTool === 'text' ? (
        <View style={[styles.textRow, { backgroundColor: palette.backgroundElement }]}>
          <TextInput
            value={pendingText}
            onChangeText={setPendingText}
            placeholder="Nhập nội dung ghi chú, rồi chạm vào trang…"
            placeholderTextColor={palette.textSecondary}
            style={[styles.textInput, { color: palette.text }]}
          />
        </View>
      ) : null}

      <View style={styles.secondRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, alignItems: 'center' }}>
          {palette.swatches.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? palette.primary : 'transparent' }]}
            />
          ))}
          <View style={[styles.sep, { backgroundColor: palette.border }]} />
          <Pressable onPress={() => setShowStyle((v) => !v)} style={[styles.toolBtn, showStyle && { backgroundColor: palette.backgroundSelected }]}>
            <Ionicons name="options-outline" size={18} color={palette.textSecondary} />
          </Pressable>
          <View style={[styles.sep, { backgroundColor: palette.border }]} />

          {/* Undo — contextual helper when the stack is empty (guidance). */}
          <View ref={undoRef} collapsable={false}>
            {canUndo ? (
              <Pressable onPress={undo} style={styles.toolBtn} accessibilityLabel="Hoàn tác">
                <Ionicons name="arrow-undo-outline" size={18} color={palette.text} />
              </Pressable>
            ) : (
              <ContextualHelper
                content={undoHelper}
                placement="top"
                align="right"
                onOpen={undoEmptyGuidance.markHelperOpened}>
                <View style={[styles.toolBtn, { opacity: 0.3 }]} accessibilityLabel="Hoàn tác (chưa có thao tác)">
                  <Ionicons name="arrow-undo-outline" size={18} color={palette.text} />
                </View>
              </ContextualHelper>
            )}
          </View>

          <Pressable onPress={redo} disabled={!canRedo} style={[styles.toolBtn, !canRedo && { opacity: 0.3 }]}>
            <Ionicons name="arrow-redo-outline" size={18} color={palette.text} />
          </Pressable>
        </ScrollView>
      </View>

      {showStyle ? (
        <View style={[styles.stylePanel, { backgroundColor: palette.backgroundElement }]}>
          <View style={styles.styleRow}>
            <ThemedText type="caption" color="textSecondary" style={{ width: 64 }}>
              Độ mờ
            </ThemedText>
            <StyleSlider value={opacity} onChange={setOpacity} palette={palette} />
          </View>
          <View style={styles.styleRow}>
            <ThemedText type="caption" color="textSecondary" style={{ width: 64 }}>
              Nét
            </ThemedText>
            <StyleSlider value={strokeWidth / 8} onChange={(v) => setStrokeWidth(v * 8)} palette={palette} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function StyleSlider({ value, onChange, palette }: { value: number; onChange: (v: number) => void; palette: ReturnType<typeof usePalette> }) {
  const steps = 10;
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: Spacing.one, alignItems: 'center' }}>
      {Array.from({ length: steps }).map((_, i) => {
        const active = value >= (i + 1) / steps;
        return (
          <Pressable
            key={i}
            onPress={() => onChange((i + 1) / steps)}
            style={[styles.sliderDot, { backgroundColor: active ? palette.primary : palette.backgroundSelected }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: Spacing.two },
  toolRow: { gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  toolBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.md, minWidth: 52, gap: 2 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  sep: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: Spacing.one },
  secondRow: { flexDirection: 'row', paddingHorizontal: Spacing.two, paddingTop: Spacing.one },
  textRow: { marginHorizontal: Spacing.two, borderRadius: Radius.md, paddingHorizontal: Spacing.two, marginTop: Spacing.one },
  textInput: { fontSize: 14, paddingVertical: Spacing.two },
  stylePanel: { marginHorizontal: Spacing.two, marginTop: Spacing.two, borderRadius: Radius.md, padding: Spacing.two, gap: Spacing.two },
  styleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sliderDot: { flex: 1, height: 8, borderRadius: 4 },
  sigTooltip: { position: 'absolute', bottom: 56, right: Spacing.two },
});
