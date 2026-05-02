'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { ChatFocusedEntity } from '@/lib/chat/view-context';

export interface ChatViewContextPatch {
    tab?: string;
    sub?: string;
    focusedEntity?: ChatFocusedEntity;
    recentlyViewedIds?: string[];
    selectedEntityIds?: Record<string, string[]>;
}

interface ChatViewContextValue {
    patch: ChatViewContextPatch;
    setViewContextPatch: (patch: ChatViewContextPatch) => void;
}

const ChatViewContext = createContext<ChatViewContextValue | null>(null);

export function ChatViewContextProvider({ children }: { children: ReactNode }) {
    const [patch, setPatch] = useState<ChatViewContextPatch>({});

    const setViewContextPatch = useCallback((nextPatch: ChatViewContextPatch) => {
        setPatch((current) => ({ ...current, ...nextPatch }));
    }, []);

    const value = useMemo(
        () => ({
            patch,
            setViewContextPatch,
        }),
        [patch, setViewContextPatch]
    );

    return <ChatViewContext.Provider value={value}>{children}</ChatViewContext.Provider>;
}

export function useChatViewContextPatch(): ChatViewContextValue {
    const value = useContext(ChatViewContext);
    if (value) return value;
    return {
        patch: {},
        setViewContextPatch: () => {},
    };
}
