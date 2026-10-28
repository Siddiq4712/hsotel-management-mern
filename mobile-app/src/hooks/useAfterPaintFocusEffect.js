import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Let the newly selected tab paint before cached responses trigger more renders.
// This schedules focus refreshes only; direct button actions remain immediate.
export default function useAfterPaintFocusEffect(effect) {
  useFocusEffect(useCallback(() => {
    let secondFrame;
    let cleanup;
    let cancelled = false;
    const firstFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      secondFrame = requestAnimationFrame(() => {
        if (!cancelled) cleanup = effect();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [effect]));
}
