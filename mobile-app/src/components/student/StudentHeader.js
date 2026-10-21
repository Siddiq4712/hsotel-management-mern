import { Text } from "../common/ReferenceDesign";
import React from 'react';
import { Image, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, UserRound } from 'lucide-react-native';
import colors from '../../theme/colors';
import { useStudentPresentation } from './StudentPresentation';
import NotificationBell from '../common/NotificationBell';
import ReferenceHeader from '../common/ReferenceHeader';
import { useReferenceDesign } from '../common/ReferenceDesign';

export default function StudentHeader({ title = 'Hostel Management', back = false }) {
  const navigation = useNavigation();
  const { embedded } = useStudentPresentation();
  const { enabled } = useReferenceDesign();
  if (embedded) return null;
  if (enabled) return <ReferenceHeader title={title} back={back}
    actions={<TouchableOpacity
      accessibilityRole="button" accessibilityLabel="Open student profile" style={styles.control}
      onPress={() => navigation.navigate('StudentTabs', { screen: 'Profile', params: { screen: 'StudentAccount' } })}>
      <UserRound size={21} color={colors.primary} />
    </TouchableOpacity>} />;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.row}>
        {back ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}
          style={styles.control}><ArrowLeft size={21} color={colors.mutedText} /></TouchableOpacity>
          : <Image source={require('../../../assets/nec-logo.png')} style={styles.logo}
            resizeMode="contain" accessibilityLabel="National Engineering College logo" />}
        <Text style={[styles.title, back && styles.center]} numberOfLines={back ? 1 : 2}>{title}</Text>
        <View style={styles.actions}>
        <NotificationBell />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open student profile"
          onPress={() => navigation.navigate('StudentTabs', { screen: 'Profile', params: { screen: 'StudentAccount' } })} style={styles.control}>
          <UserRound size={21} color={colors.primary} />
        </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  logo: { width: 28, height: 36, marginHorizontal: 4 },
  title: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.primaryDark },
  center: { textAlign: 'center', color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  control: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
});
