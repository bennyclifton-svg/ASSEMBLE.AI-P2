import { useState } from 'react';

interface LayoutConfig {
    leftWidth: number;
    centerWidth: number;
    rightWidth: number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
    leftWidth: 25,
    centerWidth: 50,
    rightWidth: 25
};

export function useLayoutStore() {
    const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);

    const updateLayout = (newLayout: Partial<LayoutConfig>) => {
        setLayout(prev => ({ ...prev, ...newLayout }));
    };

    const resetLayout = () => {
        setLayout(DEFAULT_LAYOUT);
    };

    return {
        layout,
        updateLayout,
        resetLayout
    };
}
