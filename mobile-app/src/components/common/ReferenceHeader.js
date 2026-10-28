import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import TouchableOpacity from './Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { Text } from './ReferenceDesign';
import NotificationBell from './NotificationBell';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function ReferenceHeader({ title, subtitle, back, actions, notifications = true, settings = true }) {
  const navigation = useNavigation();
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <View style={styles.row}>
      {back ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.control}
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}>
        <ArrowLeft size={21} color={colors.mutedText} />
      </TouchableOpacity> : <Image source={require('../../../assets/nec-logo.png')} style={styles.crest}
        resizeMode="contain" accessibilityLabel="National Engineering College logo" />}
      <View style={styles.identity}><Text numberOfLines={2} style={styles.title}>{title}</Text>
        {subtitle && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>}</View>
      <View style={styles.actions}>{notifications && <NotificationBell />}
        {settings && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open settings" style={styles.control}
          onPress={() => navigation.navigate('Settings')}><Settings size={20} color={colors.mutedText} /></TouchableOpacity>}
        {actions}</View>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  crest: { width: 32, height: 41 }, identity: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: typography.header, fontWeight: '700', color: colors.primaryDark },
  subtitle: { fontSize: 11, color: colors.mutedText },
  control: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
