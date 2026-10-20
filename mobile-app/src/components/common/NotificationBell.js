import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { ArrowLeft, Bell, Check, ChevronRight, RefreshCw, X } from 'lucide-react-native';
import moment from 'moment';
import { notificationAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../theme/colors';
import Button from './Button';
import Card from './Card';

// A new account gets a fresh inbox; requests from an old account cannot populate it.
export default function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;
  return userId ? <AccountNotifications key={String(userId)} /> : null;
}

export function AccountNotifications() {
  const focused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState || 'active');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [latestId, setLatestId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const page = useRef(1);
  const request = useRef(0);
  const fetching = useRef(0);
  const writing = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', setAppState);
    return () => { mounted.current = false; request.current++; subscription.remove(); };
  }, []);

  const load = useCallback(async (append = false, background = false) => {
    if (background && (fetching.current || writing.current)) return;
    const version = ++request.current;
    const nextPage = append ? page.current + 1 : 1;
    fetching.current = version;
    setLoading(true);
    try {
      const response = await notificationAPI.getNotifications({ status: filter, page: nextPage, pageSize: 20 });
      if (!mounted.current || version !== request.current) return;
      const data = response.data;
      const rows = data.data || [];
      const keepHistory = background && filter === 'all' && page.current > 1;
      setItems(current => append
        ? [...current.filter(row => !rows.some(item => item.id === row.id)), ...rows]
        : keepHistory ? [...rows, ...current.filter(row => !rows.some(item => item.id === row.id))] : rows);
      page.current = append ? nextPage : keepHistory ? page.current : 1;
      setUnread(data.unreadCount || 0);
      setTotal(data.total || 0);
      setLatestId(data.latestId || 0);
      setError('');
    } catch (failure) {
      if (mounted.current && version === request.current) setError(failure.message || 'Unable to load notifications.');
    } finally {
      if (fetching.current === version) fetching.current = 0;
      if (mounted.current && version === request.current) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!focused || appState !== 'active') {
      request.current++;
      fetching.current = 0;
      setLoading(false);
      if (!focused) setOpen(false);
      return;
    }
    load();
    const timer = setInterval(() => load(false, true), 30000);
    return () => { request.current++; fetching.current = 0; clearInterval(timer); };
  }, [focused, appState, load]);

  const read = async item => {
    if (writing.current) return;
    setSelected(item);
    if (item.status === 'read') return;
    writing.current = true;
    request.current++;
    fetching.current = 0;
    setLoading(false);
    setWorking(true);
    try {
      await notificationAPI.markRead(item.id);
      if (mounted.current) await load();
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Unable to mark this notification as read.');
    } finally { writing.current = false; if (mounted.current) setWorking(false); }
  };
  const readAll = async () => {
    if (writing.current || !unread || loading) return;
    writing.current = true;
    request.current++;
    fetching.current = 0;
    setWorking(true);
    try {
      await notificationAPI.markAllRead({ throughId: latestId });
      if (mounted.current) await load();
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Unable to mark notifications as read.');
    } finally { writing.current = false; if (mounted.current) setWorking(false); }
  };
  const show = () => { setOpen(true); setSelected(null); if (!fetching.current && !writing.current) load(); };

  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
      accessibilityState={{ expanded: open }} onPress={show} style={styles.bell}>
      <Bell size={21} color={colors.primary} />
      {unread > 0 && <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
    </TouchableOpacity>
    <Modal visible={open} animationType="slide" onRequestClose={() => selected ? setSelected(null) : setOpen(false)}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.page}>
        <View style={styles.header}>
          {!!selected && <Button variant="ghost" accessibilityLabel="Back to notifications" onPress={() => setSelected(null)}><ArrowLeft size={21} color={colors.text} /></Button>}
          <View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>Notifications</Text><Text style={styles.meta}>{unread} unread</Text></View>
          <Button variant="ghost" accessibilityLabel="Close notifications" onPress={() => setOpen(false)}><X size={22} color={colors.text} /></Button>
        </View>
        {selected ? <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <Card style={styles.item}>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <Text selectable style={styles.body}>{selected.message}</Text>
            <Text style={styles.meta}>{selected.createdAt ? moment(selected.createdAt).format('DD MMM YYYY · h:mm A') : ''}</Text>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <Button variant="secondary" onPress={() => setSelected(null)}>Back to notifications</Button>
          </Card>
        </ScrollView> : <FlatList style={{ flex: 1 }} data={items} keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.content} refreshing={loading} onRefresh={() => !working && load()}
          ListHeaderComponent={<View style={styles.tools}>
            <View style={styles.row}>{[['all', 'All'], ['unread', 'Unread']].map(([value, label]) => <Button key={value}
              variant={filter === value ? 'primary' : 'secondary'} disabled={working} accessibilityState={{ selected: filter === value }}
              onPress={() => { setSelected(null); setFilter(value); }} style={{ flex: 1 }}>{label}</Button>)}</View>
            <View style={styles.row}>
              <Button variant="secondary" disabled={!unread || loading || working} loading={working} onPress={readAll} style={{ flex: 1 }}>Mark all read</Button>
              <Button variant="ghost" accessibilityLabel="Refresh notifications" disabled={loading || working} onPress={() => load()}><RefreshCw color={colors.primary} size={20} /></Button>
            </View>
            {!!error && <Card style={styles.error}><Text style={styles.errorText}>{error}</Text><Button variant="ghost" disabled={loading || working} onPress={() => load()}>Retry</Button></Card>}
          </View>}
          ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.meta}>Loading notifications…</Text></View>
            : !error ? <View style={styles.empty}><Bell size={36} color={colors.mutedText} /><Text style={styles.emptyTitle}>{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</Text></View> : null}
          renderItem={({ item }) => {
            const isUnread = item.status === 'unread';
            return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${isUnread ? 'Read' : 'View'} notification: ${item.title}`}
              accessibilityState={{ disabled: working }} disabled={working} onPress={() => read(item)}>
              <Card style={[styles.item, isUnread && styles.unreadItem]}>
                <View style={styles.itemHeading}><Text style={styles.itemTitle}>{item.title}</Text>
                  {isUnread ? <View style={styles.dot} /> : <Check color={colors.success} size={16} />}</View>
                <Text numberOfLines={2} style={styles.body}>{item.message}</Text>
                <View style={styles.itemHeading}><Text style={styles.meta}>{item.createdAt ? moment(item.createdAt).format('DD MMM YYYY · h:mm A') : ''}</Text>
                  <ChevronRight color={colors.mutedText} size={16} /></View>
              </Card>
            </TouchableOpacity>;
          }}
          ListFooterComponent={items.length < total ? <Button variant="secondary" disabled={working || loading} onPress={() => load(true)} style={{ marginTop: 4 }}>Load more</Button> : null}
        />}
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 19, minHeight: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.card, fontSize: 10, fontWeight: '700' },
  page: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  meta: { fontSize: 12, lineHeight: 18, color: colors.mutedText },
  content: { padding: 16, paddingBottom: 32 }, tools: { gap: 12, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  item: { padding: 16, marginBottom: 12, gap: 10 }, unreadItem: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint },
  itemHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 22, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 22, color: colors.mutedText },
  detailTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.primaryDark },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  error: { padding: 12, backgroundColor: colors.dangerSoft, gap: 8 }, errorText: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyTitle: { fontSize: 16, color: colors.text, textAlign: 'center', fontWeight: '600' },
});
