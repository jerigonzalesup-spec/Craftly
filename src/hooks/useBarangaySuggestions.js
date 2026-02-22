import { useState } from 'react';
import { SORTED_BARANGAYS } from '@/lib/dagupanBarangays';

/**
 * Custom hook to manage barangay input and suggestions
 * Eliminates duplicate logic between personal and shop address sections
 */
export function useBarangaySuggestions() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (value) => {
    setInput(value);

    if (value.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = SORTED_BARANGAYS.filter(barangay =>
      barangay.toLowerCase().includes(value.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 8));
    setShowSuggestions(true);
  };

  const selectBarangay = (barangay) => {
    setInput(barangay);
    setShowSuggestions(false);
    return barangay;
  };

  const resetBarangay = () => {
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return {
    input,
    setInput,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleChange,
    selectBarangay,
    resetBarangay,
  };
}
