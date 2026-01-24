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

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within SearchProvider');
    return context;
};

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
    const [query, setQuery] = useState("常州小程序开发公司哪家好");
    const [selectedBrands, setSelectedBrands] = useState<string[]>(['豆包']);
    const [searchType, setSearchType] = useState<'quick' | 'deep'>('quick');
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

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
