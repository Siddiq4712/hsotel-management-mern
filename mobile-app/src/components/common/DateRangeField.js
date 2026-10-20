import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
import Button from './Button';
import colors from '../../theme/colors';
import { dateKey, inclusiveDays, monthDays, selectRangeDay } from '../../utils/dateRange';

// Native equivalent of the web Duration RangePicker; values stay YYYY-MM-DD.
export default function DateRangeField({ from, to, onChange, minimumDate, disabled = false, label = 'Duration *', style, className }) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [month, setMonth] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const minimum = dateKey(minimumDate);
  const days = inclusiveDays(from, to);
  const open = () => {
    setDraft({ from: dateKey(from), to: dateKey(to) });
    setMonth(moment(dateKey(from) || minimum || undefined).startOf('month').format('YYYY-MM-DD'));
    setVisible(true);
  };
  const moveMonth = amount => setMonth(value => moment(value).add(amount, 'month').format('YYYY-MM-DD'));
  const previousDisabled = Boolean(minimum && moment(month).isSameOrBefore(moment(minimum), 'month'));
  const calendarDays = monthDays(month);
  const weekCount = Math.ceil((moment(month).startOf('month').day() + moment(month).daysInMonth()) / 7);
  return <View className={className} style={[styles.field, style]}>
    <View style={styles.labelRow}><Text style={styles.label}>{label}</Text>
      {!!days && <Text style={styles.help}>{days} {days === 1 ? 'day' : 'days'}, inclusive</Text>}
    </View>
    <Button variant="secondary" disabled={disabled} onPress={open} accessibilityLabel="Select duration date range"
      accessibilityHint="Choose the start and end dates in the calendar."
      style={styles.trigger}>
      <View style={styles.rangeValues}>
        <Text style={[styles.value, styles.dateValue]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{from ? moment(from).format('DD MMM YYYY') : 'Start date'}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={[styles.value, styles.dateValue]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{to ? moment(to).format('DD MMM YYYY') : 'End date'}</Text>
      </View>
      <CalendarDays color={colors.primary} size={18} style={{ flexShrink: 0 }} />
    </Button>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogContent}>
          <Text accessibilityRole="header" style={styles.title}>Select duration</Text>
          <Text style={styles.help}>{!draft.from || draft.to ? 'Choose start date, then end date.' : 'Choose end date. Tap the start again for one day.'}</Text>
          <View style={styles.rangeSummary}>
            <Text style={[styles.value, styles.dateValue]}>{draft.from ? moment(draft.from).format('DD MMM YYYY') : 'Start date'}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={[styles.value, styles.dateValue]}>{draft.to ? moment(draft.to).format('DD MMM YYYY') : 'End date'}</Text>
          </View>
          <View style={styles.monthBar}>
            <Button variant="ghost" disabled={previousDisabled} accessibilityLabel="Previous month" onPress={() => moveMonth(-1)}><ChevronLeft color={colors.primary} size={22} /></Button>
            <Text style={styles.month}>{moment(month).format('MMMM YYYY')}</Text>
            <Button variant="ghost" accessibilityLabel="Next month" onPress={() => moveMonth(1)}><ChevronRight color={colors.primary} size={22} /></Button>
          </View>
          <View style={styles.week}>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
          <View style={styles.grid}>{Array.from({ length: weekCount }, (_, week) => <View key={week} style={styles.calendarRow}>
            {calendarDays.slice(week * 7, week * 7 + 7).map(day => {
            const blocked = !day.inMonth || Boolean(minimum && day.key < minimum);
            const endpoint = day.key === draft.from || day.key === draft.to;
            const between = draft.from && draft.to && day.key > draft.from && day.key < draft.to;
            return <TouchableOpacity key={day.key} disabled={blocked} accessibilityRole="button"
              accessibilityLabel={moment(day.key).format('dddd DD MMMM YYYY')}
              accessibilityState={{ disabled: blocked, selected: endpoint || Boolean(between) }}
              onPress={() => setDraft(value => selectRangeDay(value, day.key))}
              style={[styles.day, between && styles.between, endpoint && styles.endpoint]}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
                style={[styles.dayText, blocked && styles.blocked, endpoint && styles.selectedText]}>{day.inMonth ? String(day.day) : ''}</Text>
            </TouchableOpacity>;
          })}</View>)}</View>
          <Text style={styles.help}>{inclusiveDays(draft.from, draft.to) ? `${inclusiveDays(draft.from, draft.to)} days selected, inclusive` : 'Select both dates to continue.'}</Text>
          <View style={styles.buttons}><Button variant="ghost" onPress={() => setVisible(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button disabled={!inclusiveDays(draft.from, draft.to)} onPress={() => { onChange(draft.from, draft.to); setVisible(false); }} style={{ flex: 1 }}>Apply dates</Button></View>
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  field: { minWidth: 0, maxWidth: '100%', alignSelf: 'stretch', gap: 8 }, label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  trigger: { minWidth: 0, maxWidth: '100%', alignSelf: 'stretch', height: 48, flexWrap: 'nowrap', paddingHorizontal: 12, paddingVertical: 0, gap: 8, backgroundColor: colors.background, borderColor: colors.border },
  rangeValues: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateValue: { flex: 1, minWidth: 0, flexShrink: 1 },
  arrow: { fontSize: 14, color: colors.mutedText, flexShrink: 0 },
  value: { fontSize: 14, lineHeight: 21, color: colors.text, fontWeight: '600' },
  help: { fontSize: 13, lineHeight: 20, color: colors.mutedText },
  overlay: { flex: 1, backgroundColor: '#0F172A80', justifyContent: 'center', padding: 16 },
  dialog: { backgroundColor: colors.card, borderRadius: 16, maxHeight: '85%', width: '100%', maxWidth: 360, alignSelf: 'center', overflow: 'hidden' },
  dialogContent: { padding: 16, gap: 8 }, title: { fontSize: 20, color: colors.primaryDark, fontWeight: '700' },
  rangeSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.background },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 16, fontWeight: '700', color: colors.text },
  week: { flexDirection: 'row', alignSelf: 'stretch' }, weekday: { flex: 1, minWidth: 0, textAlign: 'center', color: colors.mutedText, fontWeight: '600', fontSize: 12 },
  grid: { alignSelf: 'stretch' }, calendarRow: { flexDirection: 'row', alignSelf: 'stretch' },
  day: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 0, alignItems: 'stretch', justifyContent: 'center', marginVertical: 2, borderRadius: 10 },
  dayText: { width: '100%', flexShrink: 0, textAlign: 'center', paddingHorizontal: 0, fontSize: 16, lineHeight: 24, fontWeight: '500', color: colors.text }, blocked: { color: colors.borderStrong },
  between: { backgroundColor: colors.primarySoft }, endpoint: { backgroundColor: colors.primary }, selectedText: { color: colors.card, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 12, paddingTop: 4 },
});
