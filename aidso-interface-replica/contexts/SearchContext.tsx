import React, { createContext, useContext, useState } from 'react';

interface SearchContextType {
    query: string;
    setQuery: (q: string) => void;
    selectedBrands: string[];
    setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;
    searchType: 'quick' | 'deep';
    setSearchType: React.Dispatch<React.SetStateAction<'quick' | 'deep'>>;
    isSearching: boolean;
    setIsSearching: (v: boolean) => void;
    hasSearched: boolean;
    setHasSearched: (v: boolean) => void;
    toggleBrand: (name: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const STORAGE_KEY = 'qingkuaisou_search_state_v1';

function loadPersistedState(): {
    query?: string;
    selectedBrands?: string[];
    searchType?: 'quick' | 'deep';
} {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw) as any;
        const next: any = {};
        if (typeof data?.query === 'string') next.query = data.query;
        if (Array.isArray(data?.selectedBrands)) {
            next.selectedBrands = data.selectedBrands.filter((x: any) => typeof x === 'string');
        }
        if (data?.searchType === 'quick' || data?.searchType === 'deep') next.searchType = data.searchType;
        return next;
    } catch {
        return {};
    }
}

function savePersistedState(state: { query: string; selectedBrands: string[]; searchType: 'quick' | 'deep' }) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore storage failures (private mode / quota / etc)
    }
}

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within SearchProvider');
    return context;
};

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
    const initial = React.useMemo(() => loadPersistedState(), []);
    const [query, setQuery] = useState(initial.query ?? "");
    const [selectedBrands, setSelectedBrands] = useState<string[]>(initial.selectedBrands ?? []);
    const [searchType, setSearchType] = useState<'quick' | 'deep'>(initial.searchType ?? 'quick');
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Persist search preferences; debounce query to avoid syncing on every keystroke.
    React.useEffect(() => {
        const t = setTimeout(() => {
            savePersistedState({ query, selectedBrands, searchType });
        }, 250);
        return () => clearTimeout(t);
    }, [query, selectedBrands, searchType]);

    const toggleBrand = (name: string) => {
        setSelectedBrands(prev => 
            prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
        );
    };

    return (
        <SearchContext.Provider value={{
            query, setQuery,
            selectedBrands, setSelectedBrands,
            searchType, setSearchType,
            isSearching, setIsSearching,
            hasSearched, setHasSearched,
            toggleBrand
        }}>
            {children}
        </SearchContext.Provider>
    );
};
