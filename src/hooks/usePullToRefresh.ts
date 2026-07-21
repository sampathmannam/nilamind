import { useState, useRef, useCallback } from "react";

const THRESHOLD = 80; // px to pull before refresh triggers
const MAX_PULL = 120; // max pull distance in px

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const scrolling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    scrolling.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      currentY.current = e.touches[0].clientY;
      const dy = currentY.current - startY.current;

      if (dy > 0 && !scrolling.current) {
        const distance = Math.min(dy * 0.5, MAX_PULL);
        setPullDistance(distance);
        setPulling(true);
      }
    },
    []
  );

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        setPulling(false);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return {
    pullDistance,
    pulling,
    refreshing,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
