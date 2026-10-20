import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

// Render all existing routes without squeezing their labels into the screen width.
export default function MobileTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef(null);
  const positions = useRef({});
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const activeKey = state.routes[state.index].key;
  useEffect(() => {
    const x = positions.current[activeKey];
    if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [activeKey]);

  if (keyboardShown) return null;
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <Text style={styles.hint}>Swipe to see all sections</Text>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.mutedText;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          return (
            <TouchableOpacity key={route.key}
              accessibilityRole="tab" accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? (typeof label === 'string' ? label : route.name)}
              testID={options.tabBarButtonTestID}
              onLayout={({ nativeEvent }) => {
                const previous = positions.current[route.key];
                positions.current[route.key] = nativeEvent.layout.x;
                if (focused && previous !== nativeEvent.layout.x) scroll.current?.scrollTo({ x: Math.max(0, nativeEvent.layout.x - 16), animated: false });
              }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              activeOpacity={0.7} style={[styles.tab, focused && styles.active]}>
              {options.tabBarIcon?.({ focused, color, size: 21 })}
              {typeof label === 'function'
                ? label({ focused, color, position: 'below-icon', children: options.title ?? route.name })
                : <Text style={[styles.label, { color }]}>{label}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  hint: { color: colors.mutedText, fontSize: 11, textAlign: 'center', marginBottom: 4 },
  content: { paddingHorizontal: 12, gap: 6 },
  tab: { minWidth: 92, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden', gap: 4 },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint, borderRadius: 22 },
  label: { fontSize: 12, fontWeight: '600' },
});
