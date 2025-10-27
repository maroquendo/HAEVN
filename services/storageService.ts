import { AppData } from '../types';
import getInitialData from '../utils/data';

const APP_STORAGE_KEY = 'kids-curated-feed-data';

interface StorageData {
  families: {
    [familyId: string]: AppData;
  };
  currentFamilyId?: string | null;
}

const readFromStorage = (): StorageData => {
  try {
    const rawData = localStorage.getItem(APP_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : { families: {} };
  } catch (error) {
    console.error("Failed to read from local storage", error);
    return { families: {} };
  }
};

const writeToStorage = (data: StorageData) => {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to write to local storage", error);
  }
};

export const loadDataForFamily = (familyId: string): AppData => {
  const storage = readFromStorage();
  if (storage.families[familyId]) {
    // Ensure data integrity on load, especially for new fields
    const defaultData = getInitialData();
    return { ...defaultData, ...storage.families[familyId] };
  }
  const initialData = getInitialData();
  saveDataForFamily(familyId, initialData);
  return initialData;
};

export const saveDataForFamily = (familyId: string, data: AppData) => {
  const storage = readFromStorage();
  storage.families[familyId] = data;
  writeToStorage(storage);
};

export const getCurrentFamilyId = (): string | null => {
  return readFromStorage().currentFamilyId || null;
};

export const setCurrentFamilyId = (familyId: string | null) => {
  const storage = readFromStorage();
  storage.currentFamilyId = familyId;
  writeToStorage(storage);
};

export const clearCurrentFamilyId = () => {
  setCurrentFamilyId(null);
};
