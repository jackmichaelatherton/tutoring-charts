import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ options = [], selected = [], onChange, placeholder = 'Search areas or towns…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(opt => {
    const q = query.toLowerCase();
    return opt.area.toLowerCase().includes(q) || (opt.town || '').toLowerCase().includes(q);
  });

  const toggle = (area) => {
    onChange(selected.includes(area) ? selected.filter(a => a !== area) : [...selected, area]);
  };

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map(area => (
            <span key={area} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {area}
              <button
                onClick={() => toggle(area)}
                className="text-blue-400 hover:text-blue-700 leading-none"
                aria-label={`Remove ${area}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(opt => {
            const isSelected = selected.includes(opt.area);
            return (
              <button
                key={opt.area}
                onMouseDown={e => { e.preventDefault(); toggle(opt.area); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <span className={isSelected ? 'text-blue-700' : 'text-gray-700'}>
                  <span className="font-medium">{opt.area}</span>
                  {opt.town && (
                    <span className="text-gray-400 ml-1.5">— {opt.town}</span>
                  )}
                </span>
                {isSelected && (
                  <span className="text-blue-500 shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <button
          onClick={() => { onChange([]); setQuery(''); }}
          className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
