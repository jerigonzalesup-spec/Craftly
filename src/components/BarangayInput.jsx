import { useState, useRef, useEffect } from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * Reusable component for barangay input with searchable dropdown
 * Allows users to:
 * 1. Select from dropdown list
 * 2. Type to search/filter barangays
 * Validates that selected barangay is from Dagupan, Pangasinan
 */
export function BarangayInput({
  form,
  fieldName,
  label,
  placeholder = 'Search or select barangay...',
  input,
  suggestions,
  showSuggestions,
  onInputChange,
  onSelectBarangay,
  onFocus,
  onBlur,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    onInputChange(value);
    setIsOpen(true);
  };

  const handleSelectBarangay = (barangay) => {
    const selected = onSelectBarangay(barangay);
    setIsOpen(false);
    form.clearErrors(fieldName);
  };

  const isSelected = (barangay) => {
    return input?.toLowerCase() === barangay.toLowerCase();
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="relative">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <div ref={containerRef} className="relative">
              {/* Input with search icon and dropdown arrow */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  placeholder={placeholder}
                  value={input}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setIsOpen(true);
                    onFocus?.();
                  }}
                  onBlur={() => {
                    // Only close after a brief delay to allow selection click
                    setTimeout(() => setIsOpen(false), 200);
                    onBlur?.();
                  }}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown suggestions */}
              {isOpen && (showSuggestions && suggestions.length > 0) && (
                <div className="absolute z-50 w-full mt-2 border border-gray-200 bg-white rounded-lg shadow-lg max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header showing count */}
                  {suggestions.length > 0 && (
                    <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b text-xs text-gray-600 font-medium">
                      {suggestions.length} {suggestions.length === 1 ? 'barangay' : 'barangays'} found
                    </div>
                  )}

                  {/* Suggestion list */}
                  {suggestions.map((barangay, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectBarangay(barangay)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        isSelected(barangay) ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <span className={isSelected(barangay) ? 'font-semibold text-blue-700' : ''}>{barangay}</span>
                      {isSelected(barangay) && <Check className="h-5 w-5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {isOpen && input && suggestions.length === 0 && (
                <div className="absolute z-50 w-full mt-2 border border-gray-200 bg-white rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                  No barangays found for "{input}"
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage className="text-xs mt-1" />
        </FormItem>
      )}
    />
  );
}
