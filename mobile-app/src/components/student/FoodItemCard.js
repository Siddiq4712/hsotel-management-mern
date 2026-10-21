import { Text } from "../common/ReferenceDesign";
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Plus, Clock3, CalendarDays } from 'lucide-react-native';
import Button from '../common/Button';
import Card from '../common/Card';
import colors from '../../theme/colors';
import { WEEK_DAYS, foodDeadline, foodOrderingClosed, nextFoodDate } from '../../utils/additionalFood';

const formatPrice = price => { const value = parseFloat(price); return Number.isNaN(value) ? price : value.toFixed(2); };
const FoodItemCard = React.memo(function FoodItemCard({ item, onAdd, now }) {
  const servingDate = nextFoodDate(item.weekly_day);
  const closed = foodOrderingClosed(item, servingDate, now);
  return <Card style={styles.card}>
    <View style={styles.top}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>{['Veg', 'Non-Veg'].includes(item.category) ? item.category : 'Category not set'}</Text>
          <Text style={styles.meal}>{item.meal_type || 'Meal not set'}</Text>
        </View>
      </View>
      <Text style={styles.price}>₹{formatPrice(item.price)}</Text>
    </View>
    <View style={styles.detail}><CalendarDays size={15} color={colors.mutedText} />
      <Text style={styles.body}>{item.weekly_day == null ? 'Available food' : `Every ${WEEK_DAYS[item.weekly_day]}`}</Text></View>
    <View style={styles.detail}><Clock3 size={15} color={colors.mutedText} />
      <Text style={styles.body}>Order before {foodDeadline(item, servingDate).format('h:mm A')} on the serving day (IST)</Text></View>
    {item.preparation_time_minutes ? <Text style={styles.small}>Preparation: {item.preparation_time_minutes} min</Text> : null}
    <View style={styles.bottom}>
      <Text style={[styles.small, { flex: 1 }]}>Up to {item.max_quantity_per_student ?? 1} per student per date</Text>
      <Button onPress={() => onAdd(item)} disabled={closed} accessibilityLabel={`Add ${item.name}`}
        style={{ paddingHorizontal: 18, paddingVertical: 12, backgroundColor: closed ? colors.surface : colors.buttonBackground }}>
        {!closed && <Plus size={18} color={colors.card} style={{ marginRight: 6 }} />}
        <Text style={{ color: closed ? colors.mutedText : colors.card, fontSize: 14, fontWeight: '700' }}>{closed ? 'Closed' : 'Add'}</Text>
      </Button>
    </View>
  </Card>;
});
export default FoodItemCard;
const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, marginBottom: 12 }, top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text }, tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tag: { color: colors.accent, backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '600', borderRadius: 8 },
  meal: { color: colors.mutedText, fontSize: 12 }, price: { color: colors.primary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, body: { color: colors.mutedText, fontSize: 13, lineHeight: 19, flex: 1 },
  small: { color: colors.mutedText, fontSize: 12, lineHeight: 18 }, bottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 12, gap: 12 },
});
