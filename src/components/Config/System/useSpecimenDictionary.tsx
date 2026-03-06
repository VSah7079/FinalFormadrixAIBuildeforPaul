// useSpecimenDictionary.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SpecimenEntry } from './specimenTypes';

interface SpecimenDictionaryContextValue {
  dictionary: SpecimenEntry[];
  version: number;
  addEntries: (entries: SpecimenEntry[]) => void;
  updateEntries: (entries: SpecimenEntry[]) => void;
  deprecateEntries: (ids: string[]) => void;
  replaceDictionary: (entries: SpecimenEntry[]) => void;
  exportDictionary: () => SpecimenEntry[];
}

const SpecimenDictionaryContext = createContext<SpecimenDictionaryContextValue | null>(null);

export const useSpecimenDictionary = () => {
  const ctx = useContext(SpecimenDictionaryContext);
  if (!ctx) throw new Error('useSpecimenDictionary must be used inside provider');
  return ctx;
};

export const SpecimenDictionaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dictionary, setDictionary] = useState<SpecimenEntry[]>([]);
  const [version, setVersion] = useState<number>(1);

  // Load from LocalStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('specimenDictionary');
    const rawVersion = localStorage.getItem('specimenDictionaryVersion');

    if (raw) setDictionary(JSON.parse(raw));
    if (rawVersion) setVersion(Number(rawVersion));
  }, []);

  // Persist to LocalStorage
  const persist = (entries: SpecimenEntry[], newVersion: number) => {
    setDictionary(entries);
    setVersion(newVersion);
    localStorage.setItem('specimenDictionary', JSON.stringify(entries));
    localStorage.setItem('specimenDictionaryVersion', String(newVersion));
  };

  const addEntries = (entries: SpecimenEntry[]) => {
    const updated = [...dictionary, ...entries];
    persist(updated, version + 1);
  };

  const updateEntries = (entries: SpecimenEntry[]) => {
    const updated = dictionary.map(d => {
      const match = entries.find(e => e.id === d.id);
      return match ? match : d;
    });
    persist(updated, version + 1);
  };

  const deprecateEntries = (ids: string[]) => {
    const updated = dictionary.map(d =>
      ids.includes(d.id) ? { ...d, active: false, version: d.version + 1 } : d
    );
    persist(updated, version + 1);
  };

  const replaceDictionary = (entries: SpecimenEntry[]) => {
    persist(entries, version + 1);
  };

  const exportDictionary = () => dictionary;

  return (
    <SpecimenDictionaryContext.Provider
      value={{
        dictionary,
        version,
        addEntries,
        updateEntries,
        deprecateEntries,
        replaceDictionary,
        exportDictionary,
      }}
    >
      {children}
    </SpecimenDictionaryContext.Provider>
  );
};