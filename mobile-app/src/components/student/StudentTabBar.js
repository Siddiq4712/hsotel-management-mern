import { Text } from "../common/ReferenceDesign";
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function StudentTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardShown) return null;
  return <View style={[styles.bar, { paddingBottom: Math.max(8, insets.bottom) }]}>
    {state.routes.map((route, index) => {
      const focused = index === state.index;
      const { options } = descriptors[route.key];
      const color = focused ? colors.primary : colors.mutedText;
      return <TouchableOpacity key={route.key} accessibilityRole="tab"
        accessibilityState={{ selected: focused }} accessibilityLabel={options.tabBarLabel}
        style={[styles.item, focused && styles.active]} activeOpacity={0.7}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
        <View style={styles.icon}>
          {options.tabBarIcon?.({ focused, color, size: 22 })}
        </View>
        <Text style={[styles.label, { color }]}>{options.tabBarLabel}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58, gap: 3, paddingVertical: 3, marginHorizontal: 3, borderRadius: 22, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  icon: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 24, overflow: 'hidden' },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint, borderRadius: 22 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
