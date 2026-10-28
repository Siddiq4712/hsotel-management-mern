import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import Screen from '../components/common/Screen';
import ReferenceHeader from '../components/common/ReferenceHeader';
import { PageIntro, Text, ui } from '../components/common/ReferenceDesign';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import colors from '../theme/colors';
import { TEXT_SIZES, typography, textSizeOption } from '../theme/typography';
import { useTextSize } from '../theme/TextSizeContext';

export default function SettingsScreen() {
  const { preference, ready, saving, saveError, changeTextSize } = useTextSize();
  return <Screen>
    <ReferenceHeader title="Settings" back notifications={false} settings={false} />
    <ScrollView contentContainerStyle={ui.content}>
      <PageIntro title="Text size" description="Choose a comfortable reading size for the app." />
      <Card style={styles.options}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Text size">
          {TEXT_SIZES.map((option, index) => <TouchableOpacity key={option.id}
            accessibilityRole="radio" accessibilityLabel={option.label}
            accessibilityState={{ checked: preference === option.id, disabled: !ready }}
            disabled={!ready} onPress={() => changeTextSize(option.id)}
            style={[styles.option, index > 0 && styles.divider]}>
            <Text style={styles.optionLabel}>{option.label}</Text>
            <View style={[styles.radio, preference === option.id && styles.selected]}>
              {preference === option.id && <Check size={16} color={colors.card} />}
            </View>
          </TouchableOpacity>)}
        </View>
      </Card>
      <Text style={ui.sectionTitle}>Preview</Text>
      <Card style={styles.preview}>
        <Text style={styles.previewTitle}>Your hostel, at a glance</Text>
        <Text style={styles.previewBody}>Check your attendance, meals and requests in one place.</Text>
        <Text style={ui.small}>Supporting details stay easy to read.</Text>
        <Input accessibilityLabel="Text size preview input" value="Sample input text" editable={false} style={styles.input} />
        <Button variant="secondary" accessibilityLabel="Preview button">Sample button</Button>
      </Card>
      <Text accessibilityLiveRegion="polite" style={[ui.small, saveError && styles.error]}>
        {!ready ? 'Loading your preference…' : saveError || (saving ? 'Saving…' : `${textSizeOption(preference).label} text size saved on this device.`)}
      </Text>
      <Text style={ui.small}>Text size changes throughout the app. Buttons, icons and spacing keep their proportions. Longer text may wrap onto another line.</Text>
      <Button variant="secondary" disabled={!ready} onPress={() => changeTextSize('default')}>Reset to Default</Button>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  options: { padding: 0, overflow: 'hidden' },
  option: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { flex: 1, fontSize: typography.item, fontWeight: '600' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  preview: { gap: 12 },
  previewTitle: { fontSize: typography.heroTitle, fontWeight: '700' },
  previewBody: { fontSize: typography.body },
  input: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  error: { color: colors.danger },
});
