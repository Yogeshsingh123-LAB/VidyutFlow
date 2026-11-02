import React, { useState, useRef, useEffect, useId } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';

interface LanguageSelectorProps {
  variant?: 'header' | 'mobile' | 'compact' | 'erp';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { language, setLanguage, supportedLanguages, currentLanguageOption } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const buttonId = variant === 'erp' ? 'erp-language-selector-button' : 'language-selector-button';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle keyboard navigation within the listbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = supportedLanguages.findIndex((l) => l.code === language);
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % supportedLanguages.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + supportedLanguages.length) % supportedLanguages.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < supportedLanguages.length) {
          setLanguage(supportedLanguages[focusedIndex].code);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelectLanguage = (code: LanguageCode, restoreFocus = false) => {
    if (code !== language) {
      setLanguage(code);
    }
    setIsOpen(false);
    if (restoreFocus) {
      buttonRef.current?.focus();
    }
  };

  if (variant === 'mobile') {
    return (
      <div data-language-selector="true" className={`w-full py-2 ${className}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Language / ભાષા / भाषा:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {supportedLanguages.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectLanguage(opt.code, false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                    : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700/80'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight">{opt.nativeName}</span>
                  <span className="text-[10px] text-slate-300 font-normal">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-300 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isErpVariant = variant === 'erp';

  return (
    <div
      ref={containerRef}
      data-language-selector="true"
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`Select display language. Currently selected: ${currentLanguageOption.label} (${currentLanguageOption.nativeName})`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleKeyDown}
        className={
          isErpVariant
            ? 'h-9 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none shrink-0'
            : 'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 active:bg-slate-950 border border-blue-800/80 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all duration-150 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none'
        }
      >
        <Globe
          className={`w-4 h-4 shrink-0 ${isErpVariant ? 'text-blue-600' : 'text-cyan-400'}`}
          aria-hidden="true"
        />
        <span className={`font-bold flex items-center gap-1 ${isErpVariant ? 'text-slate-800' : 'text-slate-100'}`}>
          <span className={isErpVariant ? 'hidden min-[400px]:inline' : ''}>
            {currentLanguageOption.nativeName}
          </span>
          <span
            className={
              isErpVariant
                ? 'text-[11px] text-blue-600 font-mono min-[400px]:hidden xl:inline'
                : 'text-[11px] text-cyan-300 font-mono hidden xl:inline'
            }
          >
            {isErpVariant ? `(${currentLanguageOption.shortLabel})` : `(${currentLanguageOption.shortLabel})`}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={buttonId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={
            isErpVariant
              ? 'absolute right-0 mt-1.5 w-52 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 focus:outline-none text-left animate-in fade-in zoom-in-95 duration-100'
              : 'absolute right-0 mt-1.5 w-52 rounded-xl bg-[#0B1528] border border-blue-900/90 shadow-2xl py-1.5 z-50 focus:outline-none text-left backdrop-blur-md animate-in fade-in zoom-in-95 duration-100'
          }
        >
          <div
            className={`px-3 py-1.5 border-b text-[10px] uppercase font-bold tracking-wider ${
              isErpVariant
                ? 'border-slate-100 text-slate-400'
                : 'border-blue-900/60 text-slate-400'
            }`}
          >
            Select Language · ભાષા પસંદ કરો
          </div>

          {supportedLanguages.map((opt, idx) => {
            const isSelected = opt.code === language;
            const isFocused = idx === focusedIndex;

            return (
              <li
                key={opt.code}
                role="option"
                id={`lang-option-${variant}-${opt.code}`}
                aria-selected={isSelected}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectLanguage(opt.code, false);
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors ${
                  isErpVariant
                    ? isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : isFocused
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    : isSelected
                    ? 'bg-blue-900/70 text-cyan-200 font-bold'
                    : isFocused
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`font-semibold tracking-wide ${
                      isErpVariant ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    {opt.nativeName}
                  </span>
                  <span
                    className={`text-[11px] font-normal ${
                      isErpVariant ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>

                {isSelected ? (
                  <span
                    className={`flex items-center gap-1.5 ${
                      isErpVariant ? 'text-blue-600' : 'text-cyan-400'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        isErpVariant
                          ? 'bg-blue-100/80 border-blue-200 text-blue-700'
                          : 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
                      }`}
                    >
                      Active
                    </span>
                    <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {opt.shortLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

