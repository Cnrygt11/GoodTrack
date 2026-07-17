import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';
import { TURKISH_PROVINCES } from '../../utils/constants';

/**
 * 81 il için aramalı dropdown (combobox). Kullanıcı yazarak filtreler; listeyi
 * kaydırmadan kendi iline ulaşır. Türkçe aksan katlaması yapılır: "istanbul",
 * "hakka", "sanli" gibi aksansız yazımlar da eşleşir.
 */
interface CitySelectProps {
  /** Seçili il ('' = seçim yok). */
  value: string;
  onSelect: (city: string) => void;
  /** Seçimi temizleme desteklenecekse ver; input sağında X butonu çıkar. */
  onClear?: () => void;
  /** true: seçim sonrası input temizlenir ve değer inputta gösterilmez (çoklu-seçim filtre modu). */
  clearOnSelect?: boolean;
  placeholder: string;
  noMatchText: string;
  disabled?: boolean;
}

/** Türkçe aksan/harf katlaması: iki taraf da katlanır, aksansız aramalar eşleşir. */
function foldTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export default function CitySelect({
  value,
  onSelect,
  onClear,
  clearOnSelect = false,
  placeholder,
  noMatchText,
  disabled = false,
}: CitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = foldTr(query.trim());
    if (!q) return TURKISH_PROVINCES;
    // Önce baştan eşleşenler, sonra içeren eşleşmeler.
    const starts = TURKISH_PROVINCES.filter((p) => foldTr(p).startsWith(q));
    const contains = TURKISH_PROVINCES.filter(
      (p) => !foldTr(p).startsWith(q) && foldTr(p).includes(q),
    );
    return [...starts, ...contains];
  }, [query]);

  // Dışarı tıklanınca kapan.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  // Vurgulanan öğe görünür kalsın.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const select = (city: string) => {
    onSelect(city);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  // Filtre modunda (clearOnSelect) input daima arama alanıdır; tekli modda kapalıyken seçimi gösterir.
  const inputValue = isOpen ? query : clearOnSelect ? '' : value;
  const showClear = Boolean(onClear && value && !isOpen && !clearOnSelect && !disabled);

  return (
    <div className="city-select" ref={rootRef}>
      <div className="form-group-with-icon city-select-input-wrap">
        <MapPin size={14} />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          placeholder={value && !clearOnSelect ? value : placeholder}
          value={inputValue}
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true);
            setHighlighted(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {showClear ? (
          <button
            type="button"
            className="city-select-clear"
            onClick={() => onClear?.()}
            title="Temizle"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={14} className={`city-select-chevron ${isOpen ? 'open' : ''}`} />
        )}
      </div>

      {isOpen && (
        <ul className="city-select-panel" ref={listRef} role="listbox">
          {filtered.length === 0 ? (
            <li className="city-select-empty">{noMatchText}</li>
          ) : (
            filtered.map((city, i) => (
              <li
                key={city}
                role="option"
                aria-selected={city === value}
                className={`city-select-option ${i === highlighted ? 'highlighted' : ''} ${city === value ? 'selected' : ''}`}
                onPointerDown={(e) => {
                  // pointerdown: dış-tıklama kapatıcısından önce seçim işlensin.
                  e.preventDefault();
                  select(city);
                }}
                onMouseEnter={() => setHighlighted(i)}
              >
                {city}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
