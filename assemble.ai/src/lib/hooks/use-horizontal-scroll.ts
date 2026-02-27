'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook that converts vertical mouse wheel events to horizontal scrolling
 * and tracks overflow state for fade edge indicators.
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>() {
    const scrollRef = useRef<T>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateOverflow = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        const el = scrollRef.current;
        if (!el) return;
        // Only hijack vertical scroll when there's horizontal overflow
        if (el.scrollWidth <= el.clientWidth) return;
        if (e.deltaY === 0) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateOverflow();
    }, [updateOverflow]);

    useEffect(() => {
        updateOverflow();
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(updateOverflow);
        observer.observe(el);
        return () => observer.disconnect();
    }, [updateOverflow]);

    return { scrollRef, onWheel, canScrollLeft, canScrollRight, updateOverflow };
}
