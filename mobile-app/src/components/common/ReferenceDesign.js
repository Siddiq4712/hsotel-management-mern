import React, { createContext, useContext } from 'react';
import { Text as NativeText, View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { styled } from 'nativewind';
import { ChevronRight } from 'lucide-react-native';
import colors from '../../theme/colors';

const DesignContext = createContext({ enabled: false, fontsReady: false });
const EmbeddedContext = createContext(false);
export const useReferenceDesign = () => useContext(DesignContext);
export const useEmbeddedHeader = () => useContext(EmbeddedContext);
export const EmbeddedHeader = EmbeddedContext.Provider;

export function ReferenceProvider({ children }) {
  const [fontsReady] = useFonts({
    DMRegular: require('../../../assets/fonts/DMSans_400Regular.ttf'),
    DMMedium: require('../../../assets/fonts/DMSans_500Medium.ttf'),
    DMBold: require('../../../assets/fonts/DMSans_700Bold.ttf'),
    ManropeBold: require('../../../assets/fonts/Manrope_700Bold.ttf'),
    ManropeExtraBold: require('../../../assets/fonts/Manrope_800ExtraBold.ttf'),
  });
  return <DesignContext.Provider value={{ enabled: true, fontsReady }}>{children}</DesignContext.Provider>;
}

// Home keeps the original shared-component defaults as well as its own source.
export function OriginalDesign({ children }) {
  return <DesignContext.Provider value={{ enabled: false, fontsReady: false }}>{children}</DesignContext.Provider>;
}

const ReferenceText = React.forwardRef(({ style, className, allowSmallText = false, ...props }, ref) => {
  const { enabled, fontsReady } = useReferenceDesign();
  const flat = StyleSheet.flatten(style) || {};
  const weight = Number(flat.fontWeight) || (flat.fontWeight === 'bold' ? 700 : 400);
  const size = flat.fontSize || 14;
  const family = size >= 18 && weight >= 600
    ? (weight >= 800 ? 'ManropeExtraBold' : 'ManropeBold')
    : weight >= 600 ? 'DMBold' : weight >= 500 ? 'DMMedium' : 'DMRegular';
  return <NativeText ref={ref} {...props} className={className}
    style={[enabled && { color: colors.text, fontSize: 14 }, style, enabled && !allowSmallText && size < 12 && { fontSize: 12 },
      enabled && fontsReady && { fontFamily: family, fontWeight: 'normal' }]} />;
});
ReferenceText.displayName = 'ReferenceText';
export const Text = styled(ReferenceText);

export function PageIntro({ title, description, eyebrow, trailing, style }) {
  return <View style={[ui.intro, style]}>
    <View style={{ flex: 1, gap: 5 }}>
      {eyebrow && <Text style={ui.eyebrow}>{eyebrow}</Text>}
      <Text accessibilityRole="header" style={ui.title}>{title}</Text>
      {description && <Text style={ui.description}>{description}</Text>}
    </View>{trailing}
  </View>;
}

export function Segments({ items, value, onChange, style, scrollable = false }) {
  if (scrollable) return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    style={{ flexGrow: 0 }} contentContainerStyle={[ui.segments, style]}>
    {items.map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)}
      style={[ui.segment, { flex: 0, minWidth: 96, paddingHorizontal: 10 }, value === key && ui.selectedSegment]}>
      <Text style={[ui.segmentLabel, value === key && { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
  return <View accessibilityRole="tablist" style={[ui.segments, style]}>
    {items.map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="tab"
      accessibilityState={{ selected: value === key }} onPress={() => onChange(key)}
      style={[ui.segment, value === key && ui.selectedSegment]}>
      <Text style={[ui.segmentLabel, value === key && { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>)}
  </View>;
}

export function SectionTitle({ title, action, onPress }) {
  return <View style={ui.section}>
    <Text accessibilityRole="header" style={ui.sectionTitle}>{title}</Text>
    {action && onPress && <TouchableOpacity accessibilityRole="button" onPress={onPress} style={ui.textAction}>
      <Text style={ui.link}>{action}</Text><ChevronRight size={16} color={colors.primary} />
    </TouchableOpacity>}
  </View>;
}

export function ServiceLink({ icon: Icon, title, description, onPress, tone = 'primary', trailing }) {
  const accent = tone === 'teal' ? colors.accent : tone === 'warning' ? colors.warning : colors.primary;
  const fill = tone === 'teal' ? colors.accentSoft : tone === 'warning' ? colors.warningSoft : colors.primarySoft;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={ui.service}>
    {Icon && <View style={[ui.serviceIcon, { backgroundColor: fill }]}><Icon size={21} color={accent} /></View>}
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}><Text style={ui.serviceTitle}>{title}</Text>
      {description && <Text style={ui.small}>{description}</Text>}</View>
    {trailing || <ChevronRight size={18} color={colors.mutedText} />}
  </TouchableOpacity>;
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 32, gap: 12 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 25, lineHeight: 33, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary },
  description: { fontSize: 14, lineHeight: 21, color: colors.mutedText },
  small: { fontSize: 12, lineHeight: 18, color: colors.mutedText },
  segments: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 13, padding: 4, gap: 4 },
  segment: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  selectedSegment: { backgroundColor: colors.card, borderColor: colors.border },
  segmentLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedText, textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  textAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  service: { minHeight: 80, backgroundColor: colors.card, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
});
