import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronRight, Check } from 'lucide-react-native';
import { Text } from '../common/ReferenceDesign';
import Screen from '../common/Screen';
import Card from '../common/Card';
import Button from '../common/Button';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';

export function RequestHeader({ title, description, navigation, busy = false }) {
  return <SafeAreaView edges={['top']} style={requestStyles.headerSafe}>
    <View style={requestStyles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" disabled={busy}
        onPress={() => navigation.goBack()} style={requestStyles.back}><ArrowLeft size={21} color={colors.text} /></TouchableOpacity>
      <View style={{ flex: 1, gap: 3 }}><Text accessibilityRole="header" style={requestStyles.headerTitle}>{title}</Text>
        <Text style={requestStyles.small}>{description}</Text></View>
    </View>
  </SafeAreaView>;
}

export function RequestPage({ title, description, navigation, busy, children, contentStyle }) {
  return <Screen><RequestHeader {...{ title, description, navigation, busy }} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[requestStyles.content, contentStyle]}>
      {children}
    </ScrollView>
  </Screen>;
}

export function RequestField({ label, required, hint, children, style }) {
  return <View style={[{ gap: 8, minWidth: 0 }, style]}>
    <Text style={requestStyles.label}>{label}{required && <Text style={{ color: colors.danger }}> *</Text>}</Text>
    {children}{!!hint && <Text style={requestStyles.small}>{hint}</Text>}
  </View>;
}

export function RequestNote({ icon: Icon, children }) {
  return <View style={requestStyles.note}><Icon size={21} color={colors.primaryDark} />
    <Text style={{ flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 19 }}>{children}</Text>
  </View>;
}

export function RequestSelect({ label, value, options, onChange, placeholder = 'Select an option', disabled }) {
  const [open, setOpen] = useState(false);
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled: !!disabled }}
      disabled={disabled} onPress={() => setOpen(true)} style={[requestStyles.input, requestStyles.select]}>
      <Text style={{ flex: 1, color: value ? colors.text : colors.mutedText, fontSize: 14 }}>{options.find(([key]) => key === value)?.[1] || placeholder}</Text>
      <ChevronDown size={20} color={colors.text} />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={requestStyles.overlay}><Card accessibilityViewIsModal style={{ maxHeight: '75%', gap: 12 }}>
        <Text accessibilityRole="header" style={requestStyles.sectionTitle}>{label}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">{options.map(([key, title]) =>
          <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: key === value }}
            onPress={() => { onChange(key); setOpen(false); }} style={[requestStyles.option, key === value && { backgroundColor: colors.primarySoft }]}>
            <Text style={{ flex: 1, fontSize: 14, color: key === value ? colors.primary : colors.text }}>{title}</Text>
            {key === value && <Check size={18} color={colors.primary} />}
          </TouchableOpacity>)}
        </ScrollView><Button variant="ghost" onPress={() => setOpen(false)}>Close</Button>
      </Card></View>
    </Modal>
  </>;
}

export function NewRequestCard({ icon: Icon, title, description, button, onPress }) {
  return <Card style={{ padding: 16, gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={requestStyles.icon}><Icon size={22} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={requestStyles.sectionTitle}>{title}</Text><Text style={requestStyles.small}>{description}</Text></View>
    </View><Button onPress={onPress}>{button}</Button>
  </Card>;
}

export function ApplicationCard({ title, reference, status, dates, onPress, onEditResubmit, correctionRemarks, children }) {
  const tone = /reject|expired|late/.test(status) ? 'danger' : /approv|completed/.test(status) ? 'success' : /cancel/.test(status) ? 'mutedText' : 'warning';
  const statusText = { pending_admin: 'Pending review', approved_by_admin: 'Approved', approved_by_warden: 'Approved', rejected_by_admin: 'Rejected', rejected_by_warden: 'Rejected', needs_correction: 'Needs correction' }[status] || status?.replace(/_/g, ' ');
  return <Card style={{ padding: 16, gap: 10, marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: colors[tone], backgroundColor: colors[`${tone}Tint`] || colors.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, textTransform: 'capitalize' }}>{statusText}</Text>
      <Text style={requestStyles.small}>#{reference}</Text>
    </View>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textTransform: 'capitalize' }}>{title}</Text>
    <Text style={requestStyles.small}>{dates}</Text>
    {!!correctionRemarks && <Text style={requestStyles.small}>{correctionRemarks}</Text>}
    {onEditResubmit ? <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Button variant="secondary" onPress={onPress} accessibilityLabel={`View details for ${title}, ${reference}`} style={[requestStyles.outline, { flex: 1, paddingHorizontal: 8 }]}>
        <Text style={{ color: colors.buttonBackground, fontSize: 12, fontWeight: '700' }}>View details</Text>
      </Button>
      <Button onPress={onEditResubmit} accessibilityLabel={`Edit and resubmit ${reference}`} style={{ flex: 1, paddingHorizontal: 8 }}>
        <Text style={{ color: colors.buttonText, fontSize: 12, fontWeight: '700' }}>Edit & resubmit</Text>
      </Button>
    </View> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View details for ${title}, ${reference}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View details</Text><ChevronRight size={16} color={colors.primary} />
    </TouchableOpacity>}{children}
  </Card>;
}

export const requestStyles = StyleSheet.create({
  headerSafe: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 68, paddingRight: 16, paddingLeft: 8 },
  back: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: typography.header, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.card, color: colors.text, fontSize: 14 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  small: { color: colors.mutedText, fontSize: 12, lineHeight: 18 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryTint, borderRadius: 14 },
  sectionTitle: { color: colors.text, fontSize: typography.section, fontWeight: '700' },
  outline: { backgroundColor: colors.card, borderColor: colors.primaryTint, borderWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: '#00000066', padding: 24 },
  option: { minHeight: 50, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
