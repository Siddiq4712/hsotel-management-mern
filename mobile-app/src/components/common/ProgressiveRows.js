import React, { useEffect, useState } from 'react';
import Button from './Button';

// Bounded initial rendering for histories that share a screen with forms/filters.
// This does not introduce a second scrolling container or change API pagination.
export default function ProgressiveRows({ data, renderItem, resetKey, pageSize = 10 }) {
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => { setLimit(pageSize); }, [resetKey, pageSize]);
  return <>
    {data.slice(0, limit).map((item, index) => <React.Fragment key={item.id ?? index}>{renderItem(item, index)}</React.Fragment>)}
    {data.length > limit && <Button variant="secondary" onPress={() => setLimit(value => value + pageSize)}
      style={{ marginVertical: 12 }}>Load more history ({data.length - limit} remaining)</Button>}
  </>;
}
