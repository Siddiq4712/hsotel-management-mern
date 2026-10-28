import { usePermissions, mobileRouteScreens } from '../../auth/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import { Text } from "./ReferenceDesign";
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, Keyboard, useWindowDimensions } from 'react-native';
import TouchableOpacity from './Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import { typography } from '../../theme/typography';

// Render all existing routes without squeezing their labels into the screen width.
export default function MobileTabBar({ state, descriptors, navigation }) {
  const { can } = usePermissions();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const highlightWidth = Math.min(80, Math.max(48, Math.floor((width - 46) / 4)));
  const scroll = useRef(null);
  const positions = useRef({});
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const fixedTabs = state.routes.length <= 4;
  const activeKey = state.routes[state.index].key;
  useEffect(() => {
    if (fixedTabs) return;
    const x = positions.current[activeKey];
    if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [activeKey, fixedTabs]);

  if (keyboardShown) return null;
  const tabItems = state.routes.map((route, index) => {
          const required = mobileRouteScreens(user?.role, route.name);
          if (required && !required.some(id => can(id))) return null;
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.mutedText;
          const label = options.tabBarLabel ?? options.title ?? route.name;
          return (
            <TouchableOpacity key={route.key}
              accessibilityRole="tab" accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? (typeof label === 'string' ? label : route.name)}
              testID={options.tabBarButtonTestID}
              onLayout={fixedTabs ? undefined : ({ nativeEvent }) => {
                const previous = positions.current[route.key];
                positions.current[route.key] = nativeEvent.layout.x;
                if (focused && previous !== nativeEvent.layout.x) scroll.current?.scrollTo({ x: Math.max(0, nativeEvent.layout.x - 16), animated: false });
              }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              activeOpacity={0.7} style={[styles.tab, fixedTabs && styles.fixedTab]}>
              <View style={[styles.highlight, { width: highlightWidth }, focused && styles.active]}>
              {options.tabBarIcon?.({ focused, color, size: 21 })}
              {typeof label === 'function'
                ? label({ focused, color, position: 'below-icon', children: options.title ?? route.name })
                : <Text allowSmallText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.label, { color }]}>{label}</Text>}
              </View>
            </TouchableOpacity>
          );
        });
  return <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {fixedTabs ? <View style={[styles.content, styles.fixedContent]}>{tabItems}</View> :
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{tabItems}</ScrollView>}
  </View>;
}
const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22,
    marginHorizontal: 8, marginBottom: 8, paddingTop: 6, overflow: 'hidden' },
  hint: { color: colors.mutedText, fontSize: 11, textAlign: 'center', marginBottom: 4 },
  content: { paddingHorizontal: 8, gap: 4 },
  fixedContent: { flexDirection: 'row', alignItems: 'stretch' },
  fixedTab: { flex: 1, flexBasis: 0, width: 0, minWidth: 0 },
  tab: { minWidth: 92, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  highlight: { maxWidth: '100%', height: 58, paddingHorizontal: 3, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden', gap: 4 },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint, borderRadius: 22 },
  label: { fontSize: typography.navigation, fontWeight: '600', textAlign: 'center' },
});
