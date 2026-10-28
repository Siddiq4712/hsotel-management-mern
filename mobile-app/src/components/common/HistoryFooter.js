import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './ReferenceDesign';
import Button from './Button';
import colors from '../../theme/colors';

export default function HistoryFooter({ history }) {
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    {!!history.error && <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{history.error}</Text>
      <Button variant="secondary" onPress={history.retry}>Retry</Button></>}
    {history.loading ? <ActivityIndicator color={colors.primary} /> : history.hasMore && !history.error
      ? <Button variant="secondary" onPress={history.loadMore}>Load more</Button> : null}
  </View>;
}
