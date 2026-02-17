'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import type { PlaceSelection } from '@/types/lep';

interface AddressAutocompleteProps {
    value: string;
    onSelect: (place: PlaceSelection) => Promise<void>;
    onManualEdit: (value: string) => Promise<void>;
    placeholder?: string;
}

/** Map full Australian state names to codes */
const STATE_NAME_MAP: Record<string, string> = {
    'new south wales': 'NSW',
    'victoria': 'VIC',
    'queensland': 'QLD',
    'south australia': 'SA',
    'western australia': 'WA',
    'tasmania': 'TAS',
    'northern territory': 'NT',
    'australian capital territory': 'ACT',
};

function normalizeState(state: string): string {
    const upper = state.toUpperCase();
    if (['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(upper)) return upper;
    return STATE_NAME_MAP[state.toLowerCase()] || upper;
}

interface Suggestion {
    text: string;
    placeId: string;
}

interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
    address?: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        state?: string;
        postcode?: string;
        country_code?: string;
    };
}

/** Extract leading street number from user input (e.g. "10 Catherine St" → "10") */
function extractStreetNumber(input: string): string | null {
    const match = input.trim().match(/^(\d+[A-Za-z]?)\s/);
    return match ? match[1] : null;
}

/** Build a clean formatted address from Nominatim components + user's street number */
function buildFormattedAddress(result: NominatimResult, userInput: string): string {
    const addr = result.address;
    if (!addr?.road) return result.display_name;

    // Use Nominatim's house_number, or extract from user's typed input
    const number = addr.house_number || extractStreetNumber(userInput);
    const road = addr.road;
    const suburb = addr.suburb || addr.city || addr.town || '';
    const state = addr.state ? normalizeState(addr.state) : '';
    const postcode = addr.postcode || '';

    const parts = [
        number ? `${number} ${road}` : road,
        suburb,
        [state, postcode].filter(Boolean).join(' '),
    ].filter(Boolean);

    return parts.join(', ');
}

// ============================================================================
// NOMINATIM PROVIDER (free fallback)
// ============================================================================

function useNominatimAutocomplete() {
    const lastRequestTime = useRef(0);
    const MIN_INTERVAL = 1100; // 1 req/sec rate limit

    const fetchSuggestions = useCallback(async (input: string): Promise<Suggestion[]> => {
        if (input.length < 3) return [];

        // Enforce rate limit
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime.current;
        if (timeSinceLast < MIN_INTERVAL) {
            await new Promise(r => setTimeout(r, MIN_INTERVAL - timeSinceLast));
        }
        lastRequestTime.current = Date.now();

        const params = new URLSearchParams({
            q: input,
            countrycodes: 'au',
            format: 'json',
            addressdetails: '1',
            limit: '5',
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: { 'User-Agent': 'AssembleAI/1.0' },
        });

        if (!response.ok) return [];
        const results: NominatimResult[] = await response.json();

        return results.map(r => ({
            text: buildFormattedAddress(r, input),
            placeId: `nominatim_${r.place_id}`,
        }));
    }, []);

    const getPlaceDetails = useCallback(async (suggestion: Suggestion, input: string): Promise<PlaceSelection | null> => {
        // Re-fetch with full details to get lat/lng
        const params = new URLSearchParams({
            q: input,
            countrycodes: 'au',
            format: 'json',
            addressdetails: '1',
            limit: '5',
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: { 'User-Agent': 'AssembleAI/1.0' },
        });

        if (!response.ok) return null;
        const results: NominatimResult[] = await response.json();
        const match = results.find(r => `nominatim_${r.place_id}` === suggestion.placeId) || results[0];
        if (!match) return null;

        const state = match.address?.state ? normalizeState(match.address.state) : null;

        return {
            formattedAddress: buildFormattedAddress(match, input),
            placeId: suggestion.placeId,
            coordinates: { lat: parseFloat(match.lat), lng: parseFloat(match.lon) },
            state,
        };
    }, []);

    return { fetchSuggestions, getPlaceDetails };
}

// ============================================================================
// GOOGLE PLACES PROVIDER (optional, requires API key)
// ============================================================================

function useGooglePlacesAutocomplete(apiKey: string | undefined) {
    const loaderRef = useRef<any>(null);
    const sessionTokenRef = useRef<any>(null);
    const isLoadedRef = useRef(false);

    useEffect(() => {
        if (!apiKey || isLoadedRef.current) return;

        let cancelled = false;
        (async () => {
            try {
                const { Loader } = await import('@googlemaps/js-api-loader');
                const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places'] });
                const places = await (loader as any).importLibrary('places');
                if (!cancelled) {
                    loaderRef.current = places;
                    sessionTokenRef.current = new (places as any).AutocompleteSessionToken();
                    isLoadedRef.current = true;
                }
            } catch (err) {
                console.warn('Google Places failed to load:', err);
            }
        })();

        return () => { cancelled = true; };
    }, [apiKey]);

    const fetchSuggestions = useCallback(async (input: string): Promise<Suggestion[]> => {
        if (!isLoadedRef.current || !loaderRef.current || input.length < 3) return [];

        try {
            const { AutocompleteSuggestion } = loaderRef.current;
            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input,
                region: 'au',
                includedRegionCodes: ['au'],
                sessionToken: sessionTokenRef.current,
            });

            return (suggestions || []).map((s: any) => ({
                text: s.placePrediction?.text?.text || s.placePrediction?.structuredFormat?.mainText?.text || '',
                placeId: s.placePrediction?.placeId || '',
            })).filter((s: Suggestion) => s.text && s.placeId);
        } catch (err) {
            console.warn('Google Places autocomplete error:', err);
            return [];
        }
    }, []);

    const getPlaceDetails = useCallback(async (suggestion: Suggestion): Promise<PlaceSelection | null> => {
        if (!isLoadedRef.current || !loaderRef.current) return null;

        try {
            const { Place } = loaderRef.current;
            const place = new Place({ id: suggestion.placeId });
            await place.fetchFields({
                fields: ['location', 'formattedAddress', 'addressComponents'],
            });

            // Extract state from address components
            let state: string | null = null;
            const components = place.addressComponents || [];
            for (const component of components) {
                if (component.types?.includes('administrative_area_level_1')) {
                    state = normalizeState(component.shortText || component.longText || '');
                    break;
                }
            }

            // Reset session token after Place Details call (billing optimization)
            const places = loaderRef.current;
            sessionTokenRef.current = new (places as any).AutocompleteSessionToken();

            return {
                formattedAddress: place.formattedAddress || suggestion.text,
                placeId: suggestion.placeId,
                coordinates: {
                    lat: place.location?.lat() || 0,
                    lng: place.location?.lng() || 0,
                },
                state,
            };
        } catch (err) {
            console.warn('Google Places details error:', err);
            return null;
        }
    }, []);

    return { fetchSuggestions, getPlaceDetails, isAvailable: !!apiKey };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddressAutocomplete({ value, onSelect, onManualEdit, placeholder }: AddressAutocompleteProps) {
    const apiKey = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
        : '';

    const google = useGooglePlacesAutocomplete(apiKey || undefined);
    const nominatim = useNominatimAutocomplete();

    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const lastSearchRef = useRef('');
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const userEditedRef = useRef(false);

    // Sync external value
    useEffect(() => {
        if (!isFocused) {
            setInputValue(value || '');
            userEditedRef.current = false;
        }
    }, [value, isFocused]);

    // Fetch suggestions with debounce
    const fetchSuggestions = useCallback(async (input: string) => {
        if (input.length < 3) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        if (input === lastSearchRef.current) return;
        lastSearchRef.current = input;

        setIsLoading(true);
        try {
            // Use Google if available, otherwise Nominatim
            const provider = google.isAvailable ? google : nominatim;
            const results = await provider.fetchSuggestions(input);
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setSelectedIndex(-1);
        } catch {
            setSuggestions([]);
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
    }, [google, nominatim]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        userEditedRef.current = true;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 450);
    };

    const handleSelect = async (suggestion: Suggestion) => {
        setIsOpen(false);
        setSuggestions([]);
        setInputValue(suggestion.text);
        setIsSaving(true);

        try {
            const provider = google.isAvailable ? google : nominatim;
            const details = await provider.getPlaceDetails(suggestion, inputValue);
            if (details) {
                await onSelect(details);
            }
        } catch (err) {
            console.error('Address selection failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Delay closing to allow click on suggestion
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
            // Only save if the user actually typed something (not a stale sync mismatch)
            if (userEditedRef.current && inputValue !== value && !isSaving) {
                onManualEdit(inputValue);
            }
            userEditedRef.current = false;
        }, 200);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter') {
                e.preventDefault();
                inputRef.current?.blur();
            } else if (e.key === 'Escape') {
                setInputValue(value || '');
                inputRef.current?.blur();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelect(suggestions[selectedIndex]);
                } else {
                    inputRef.current?.blur();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setInputValue(value || '');
                inputRef.current?.blur();
                break;
        }
    };

    // Clean up timers
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        };
    }, []);

    return (
        <div className="relative">
            <div className="flex border-b border-[var(--color-border)]">
                <div className="w-[120px] shrink-0 px-3 py-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">Address</span>
                </div>
                <div className="flex-1 relative px-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || 'Search address...'}
                        disabled={isSaving}
                        className="w-full px-2 py-2 text-sm bg-transparent transition-all duration-150 outline-none border-0 ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none disabled:opacity-50 placeholder:text-[var(--color-text-muted)] text-[var(--color-text-primary)]"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                    />
                    {(isLoading || isSaving) && (
                        <div className="absolute right-4 top-2.5 pointer-events-none">
                            <DiamondIcon variant="empty" className="w-3.5 h-3.5 text-[var(--color-accent-copper)] animate-diamond-spin" />
                        </div>
                    )}
                    {!isLoading && !isSaving && isFocused && inputValue.length > 0 && (
                        <Search className="absolute right-4 top-2.5 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 z-50 mt-0 border border-[var(--color-border)] rounded-b bg-[var(--color-bg-secondary)] shadow-lg max-h-60 overflow-y-auto"
                    role="listbox"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.placeId}
                            type="button"
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                index === selectedIndex
                                    ? 'bg-[var(--color-accent-copper-tint)] text-[var(--color-text-primary)]'
                                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                            } ${index < suggestions.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur before click
                                handleSelect(suggestion);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                                <span className="line-clamp-2">{suggestion.text}</span>
                            </div>
                        </button>
                    ))}
                    {!google.isAvailable && (
                        <div className="px-4 py-1.5 text-[10px] text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                            Powered by OpenStreetMap Nominatim
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
