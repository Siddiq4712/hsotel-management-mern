import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Check, Clock3, TriangleAlert, FileText, ChevronRight, DoorOpen, X } from 'lucide-react-native';
import moment from 'moment';
import Card from '../common/Card';
import Button from '../common/Button';
import { Text as ReferenceText } from '../common/ReferenceDesign';
import colors from '../../theme/colors';
import { requestDate, requestTime, requestPerson, requestReview, requestStatus, requestTimeline, returnTiming } from '../../utils/requestDetails';

const surfaces = { warning: '#FFFBEB', success: '#F0FDF4', danger: '#FEF2F2', primary: '#EEF2FF', mutedText: '#F1F5F9' };
const borders = { warning: '#FCD34D', success: '#86EFAC', danger: '#FECACA', primary: '#C7D2FE', mutedText: '#E2E8F0' };
const Text = props => <ReferenceText {...props} allowSmallText />;
function Panel({ label, children, tone, style }) {
  return <View style={[styles.panel, tone && { backgroundColor: surfaces[tone], borderWidth: 1, borderColor: borders[tone] }, style]}>
    <Text style={[styles.label, tone && { color: colors[tone] }]}>{label}</Text>
    {typeof children === 'string' || typeof children === 'number' ? <Text style={styles.value}>{children}</Text> : children}
  </View>;
}

export default function ApplicationDetails({ kind, row, student, title, categoryLabel, onDocument, onBack, children }) {
  const leave = kind === 'leave', reduction = kind === 'reduction', gate = kind === 'gatepass';
  const status = requestStatus(row), review = requestReview(kind, row), pending = ['pending', 'pending_admin'].includes(row.status);
  const Person = row.Student || student;
  const name = requestPerson(Person) || 'Not recorded';
  const initials = name === 'Not recorded' ? '?' : name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const hostel = row.Hostel?.name || Person?.Hostel?.name;
  const room = Person?.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number;
  const label = leave ? 'LEAVE REQUEST' : reduction ? 'REDUCTION REQUEST' : 'GATE PASS';
  const reference = `${leave ? 'LR' : reduction ? 'MR' : 'GP'}-${row.id}`;
  const heading = title || categoryLabel || (leave ? `${row.leave_type || 'Other'} leave` : row.purpose || 'Gate pass request');
  const StatusIcon = status.tone === 'warning' ? pending ? Clock3 : TriangleAlert : status.tone === 'danger' ? X : Check;
  const events = requestTimeline(kind, row);
  const time = value => value && moment(value).isValid() ? moment(value).utcOffset(330).format('DD MMM · h:mm A') : 'Not recorded';
  return <Card style={styles.card}>
    <View style={styles.headingRow}>
      <Text style={styles.reference}>{label} · #{reference}</Text>
      <Text style={[styles.badge, { color: colors[status.tone], backgroundColor: colors[`${status.tone}Tint`] || colors.surface }]}>{status.label}</Text>
    </View>
    <Text style={styles.title}>{heading}</Text>
    <View style={[styles.banner, { backgroundColor: surfaces[status.tone], borderColor: borders[status.tone] }]}>
      <View style={[styles.statusIcon, { backgroundColor: colors[`${status.tone}Tint`] || colors.surface }]}><StatusIcon size={23} color={colors[status.tone]} /></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={styles.bannerTitle}>{row.status === 'needs_correction' && review.role ? `${status.title} by ${review.role}` : status.title}</Text>
        <Text style={[styles.small, { color: colors[status.tone] }]}>{pending ? `Submitted ${requestTime(row.createdAt)}` : gate && row.return_time ? `Returned ${requestTime(row.return_time)}` : `Reviewed ${requestTime(review.at)}`}</Text>
      </View>
    </View>
    <View style={styles.grid}>
      {gate ? <>
        <Panel label="DESTINATION" style={styles.half}>{row.destination || 'Not recorded'}</Panel>
        <Panel label={row.status === 'rejected' ? 'REVIEWED BY' : 'APPROVED BY'} style={styles.half}>{review.name}</Panel>
        <Panel label="PLANNED EXIT" style={styles.half}>{time(row.from_date)}</Panel>
        <Panel label="RETURN BY" style={styles.half}>{time(row.to_date)}</Panel>
      </> : <>
        <Panel label="START DATE" style={styles.half}>{requestDate(row.from_date)}</Panel>
        <Panel label="END DATE" style={styles.half}>{requestDate(row.to_date)}</Panel>
        <Panel label="DURATION" style={styles.half}>{`${moment(row.to_date).startOf('day').diff(moment(row.from_date).startOf('day'), 'days') + 1} days, inclusive`}</Panel>
        <Panel label={pending ? 'REVIEWER' : 'REVIEWED BY'} style={styles.half}>{review.name}</Panel>
      </>}
    </View>
    {gate && (row.exit_time || row.return_time) && <View style={styles.movements}>
      <Text style={styles.sectionTitle}>Gate movements</Text>
      {[[row.exit_time, 'ACTUAL EXIT', DoorOpen, 'primary', null], [row.return_time, 'ACTUAL RETURN', Check, 'success', returnTiming(row)]].map(([at, title, Icon, tone, detail]) => !!at && <View key={title} style={styles.movement}>
        <View style={[styles.movementIcon, { backgroundColor: surfaces[tone] }]}><Icon size={19} color={colors[tone]} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.label}>{title}</Text><Text style={styles.value}>{requestTime(at)}</Text>{detail && <Text style={styles.small}>{detail}</Text>}</View>
      </View>)}
    </View>}
    {reduction && row.activity && <Panel label="ACTIVITY / ORGANIZATION"><Text style={styles.body}>{row.activity}</Text></Panel>}
    <Panel label={leave ? 'REASON FOR LEAVE' : gate ? 'PURPOSE' : 'REQUEST REASON'}><Text style={styles.body}>{row.reason || row.purpose || 'Not recorded'}</Text></Panel>
    {!!review.remarks && <Panel label="WARDEN REMARKS" tone={status.tone === 'success' ? 'success' : status.tone === 'danger' ? 'danger' : 'warning'}><Text style={styles.body}>{review.remarks}</Text></Panel>}
    {reduction && row.document && <Panel label="SUPPORTING EVIDENCE">
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${row.document.name}`} disabled={!onDocument} onPress={() => onDocument(row)} style={styles.evidence}>
        <FileText size={23} color={colors.buttonBackground} />
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.value}>{row.document.name}</Text><Text style={styles.small}>{[row.document.mime === 'application/pdf' ? 'PDF' : row.document.mime === 'image/png' ? 'PNG' : row.document.mime === 'image/jpeg' ? 'JPEG' : row.document.mime, row.document.size != null ? `${Math.round(row.document.size / 1024)} KB` : null].filter(Boolean).join(' · ')}</Text></View>
        <ChevronRight size={19} color={colors.buttonBackground} />
      </TouchableOpacity>
    </Panel>}
    {leave && <Panel label="STUDENT"><View style={styles.student}>
      <View style={styles.avatar}><Text style={{ color: colors.buttonBackground, fontSize: 13, fontWeight: '700' }}>{initials}</Text></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={styles.value}>{name}</Text><Text style={styles.small}>{[Person?.roll_number, hostel, room && `Room ${room}`].filter(Boolean).join(' · ') || 'Student details not recorded'}</Text></View>
    </View></Panel>}
    {gate && ['approved', 'outside'].includes(row.status) && row.qr_token && <View style={{ alignItems: 'center', gap: 10 }}>
      <Image accessibilityLabel="Gate pass QR code" source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(row.qr_token)}` }} style={{ width: 180, height: 180 }} />
      <Text style={styles.small}>Show this code to security on exit and return.</Text>
    </View>}
    <View style={styles.activity}>
      <Text style={styles.sectionTitle}>{gate ? 'Pass activity' : 'Request activity'}</Text>
      {events.map((event, index) => {
        const Icon = event.pending ? Clock3 : event.tone === 'warning' ? TriangleAlert : event.tone === 'danger' ? X : Check;
        return <View key={event.key} style={styles.event}>
          {index < events.length - 1 && <View style={styles.connector} />}
          <View style={[styles.eventIcon, { backgroundColor: surfaces[event.tone] }]}><Icon size={16} color={colors[event.tone]} /></View>
          <View style={{ flex: 1, gap: 4, paddingBottom: 5 }}><Text style={styles.eventTitle}>{event.title}{event.actor && event.key === 'decision' ? ` by ${event.actor}` : ''}</Text><Text style={styles.small}>{event.pending ? event.detail : [requestTime(event.at), event.key !== 'decision' && event.actor].filter(Boolean).join(' · ')}</Text></View>
        </View>;
      })}
    </View>
    {leave && <View style={styles.notice}><Text style={{ color: colors.primaryDark, fontSize: 12, lineHeight: 19 }}>Leave approval does not automatically reduce mess charges. Submit a documented reduction separately when eligible.</Text></View>}
    {children}
    {onBack && <Button variant="secondary" onPress={onBack} style={{ backgroundColor: colors.card, borderColor: colors.buttonFocus }}>{gate ? 'Back to gate passes' : 'Back to applications'}</Button>}
  </Card>;
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: 18 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  reference: { color: colors.primaryDark, fontSize: 10, letterSpacing: 0.4 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  title: { color: colors.primaryDark, fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  banner: { padding: 14, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  small: { color: colors.mutedText, fontSize: 11, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { flexGrow: 1, flexBasis: '46%', minWidth: 0 },
  panel: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 7 },
  label: { color: colors.mutedText, fontSize: 9, letterSpacing: 0.5, fontWeight: '600' },
  value: { color: colors.text, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  body: { color: colors.mutedText, fontSize: 12, lineHeight: 19 },
  evidence: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  student: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  movements: { padding: 12, borderRadius: 12, backgroundColor: colors.surface, gap: 12 },
  movement: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  movementIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activity: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, gap: 10 },
  event: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 46 },
  connector: { position: 'absolute', left: 15, top: 30, bottom: -10, width: 1, backgroundColor: colors.border },
  eventIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: colors.text, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  notice: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryTint, padding: 14, borderRadius: 14 },
});
