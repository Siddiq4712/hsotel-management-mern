import { Text } from "./ReferenceDesign";
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import moment from 'moment';
import Card from './Card';
import Button from './Button';
import colors from '../../theme/colors';

export const displayDate = (value, includeTime = false) => value && moment(value).isValid()
  ? moment(value).format(includeTime ? 'DD MMM YYYY · h:mm A' : 'DD MMM YYYY') : 'Not recorded';
export const personName = (person, id) => person?.userName || person?.username || (id ? `User #${id}` : null);

function Detail({ label, value, full = false, tone }) {
  if (value === undefined || value === null || value === '') return null;
  return <View style={[styles.detail, full && styles.full]}>
    <Text style={styles.label}>{label}</Text><Text selectable style={[styles.value, tone && { color: colors[tone], fontWeight: '600' }]}>{String(value)}</Text>
  </View>;
}

export default function RequestDetails({ title, reference, status, statusLabel, submittedBy, reviewedBy,
  reviewLabel = 'Approved by', submittedAt, reviewedAt, fromDate, toDate, includeTime = false,
  duration, reason, reasonLabel = 'Reason', fields = [], children, compact = false, studentMeta, detailLayout = false, kind = 'Request' }) {
  const [expanded, setExpanded] = useState(false);
  const tone = /reject|urgent|late_return|expired/.test(status) ? 'danger'
    : /approv|completed|resolved|closed/.test(status) ? 'success' : /cancel/.test(status) ? 'mutedText' : 'warning';
  const surface = tone === 'mutedText' ? colors.surface : colors[`${tone}Soft`];
  if (compact && !expanded) return <Card style={styles.card}>
    <View style={styles.headingRow}><Text style={styles.label}>{reference ? '#' + reference : 'Request'}</Text>
      <View style={[styles.badge, { backgroundColor: surface }]}><Text style={[styles.status, { color: colors[tone] }]}>{statusLabel || String(status || '').replaceAll('_', ' ')}</Text></View></View>
    <Text style={styles.title}>{title}</Text>
    {submittedBy && <Text style={styles.value}>{submittedBy}</Text>}
    {(fromDate || toDate) && <Text style={styles.label}>{displayDate(fromDate, includeTime)} → {displayDate(toDate, includeTime)}</Text>}
    {reason && <Text numberOfLines={2} style={styles.value}>{reason}</Text>}
    <Button variant="secondary" onPress={() => setExpanded(true)}>View details</Button>{children}
  </Card>;
  return <Card style={styles.card}>
    <View style={styles.headingRow}><Text style={styles.label}>{detailLayout ? kind.toUpperCase() : 'Heading'}{reference ? ` · #${reference}` : ''}</Text>
      <View style={[styles.badge, { backgroundColor: surface }]}><Text style={[styles.status, { color: colors[tone] }]}>
        {statusLabel || String(status || 'Unknown').replace(/_/g, ' ')}
      </Text></View>
    </View>
    <Text style={styles.title}>{title}</Text>
    {detailLayout && <View style={styles.person}>
      <View style={styles.avatar}><Text style={styles.initials}>{String(submittedBy || '?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</Text></View>
      <View style={{flex:1,gap:4}}><Text style={[styles.value,{fontWeight:'700'}]}>{submittedBy || 'Not recorded'}</Text>{!!studentMeta && <Text style={styles.label}>{studentMeta}</Text>}</View>
    </View>}
    <View style={styles.grid}>
      {!detailLayout && <Detail label="Submitted by" value={submittedBy || 'Not recorded'} full />}
      {!detailLayout && !!studentMeta && <Detail label="Student details" value={studentMeta} full />}
      <Detail label={reviewLabel} value={reviewedBy || (status === 'pending' || status === 'pending_admin' ? 'Awaiting review' : 'Not recorded')} full />
      <Detail label="Submitted on" value={displayDate(submittedAt)} />
      {!!reviewedAt && <Detail label="Decision date" value={displayDate(reviewedAt)} />}
    </View>
    {(fromDate || toDate) && <View style={styles.dates}>
      <View style={styles.grid}><Detail label="Date from" value={displayDate(fromDate, includeTime)} />
        <Detail label="Date to" value={displayDate(toDate, includeTime)} /></View>
      {!!duration && <Text style={styles.duration}>{duration}</Text>}
    </View>}
    <View style={styles.grid}>{fields.map(field => <Detail key={field.label} {...field} />)}
      <Detail label={reasonLabel} value={reason} full /></View>
    {compact && <Button variant="ghost" onPress={() => setExpanded(false)}>Back to summary</Button>}
    {children && <View style={styles.actions}>{children}</View>}
  </Card>;
}
const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12, gap: 14 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.primaryDark },
  person: {flexDirection:'row',alignItems:'center',gap:10,paddingBottom:14,borderBottomWidth:1,borderBottomColor:colors.border},
  avatar: {width:42,height:42,borderRadius:12,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  initials: {fontSize:14,fontWeight:'700',color:colors.primary},
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  status: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 },
  detail: { flexGrow: 1, flexBasis: '43%', minWidth: 115, backgroundColor: colors.surface, borderRadius: 11, padding: 11 },
  full: { flexBasis: '100%' },
  label: { color: colors.mutedText, fontWeight: '600', fontSize: 12, marginBottom: 4 },
  value: { color: colors.text, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  dates: { backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 10 },
  duration: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  actions: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
});
