import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const SEARCH_SUGGESTIONS = [
  'ManyChat',
  'Geração de Leads',
  'Claude',
  'Anúncios com IA',
  'Automação',
  'Prompts',
];

interface VaultSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Campo de busca do cofre. O placeholder animado (efeito máquina de escrever)
 * mora aqui para que o tique de ~70ms não re-renderize a grade de recursos inteira.
 */
export const VaultSearchInput: React.FC<VaultSearchInputProps> = ({ value, onChange }) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = `Buscar "${SEARCH_SUGGESTIONS[placeholderIndex]}"...`;
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayedPlaceholder.length < currentText.length) {
      timer = setTimeout(() => {
        setDisplayedPlaceholder(currentText.slice(0, displayedPlaceholder.length + 1));
      }, 70);
    } else if (!isDeleting && displayedPlaceholder.length === currentText.length) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedPlaceholder.length > 0) {
      timer = setTimeout(() => {
        setDisplayedPlaceholder(currentText.slice(0, displayedPlaceholder.length - 1));
      }, 35);
    } else {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }

    return () => clearTimeout(timer);
  }, [displayedPlaceholder, isDeleting, placeholderIndex]);

  return (
    <div className="relative">
      <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        type="search"
        aria-label="Buscar recursos no cofre"
        placeholder={displayedPlaceholder || 'Buscar "ManyChat"...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0c0c14]/90 border border-zinc-800/90 focus:border-purple-600 rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white bg-zinc-800 px-2 py-0.5 rounded cursor-pointer"
        >
          Limpar
        </button>
      )}
    </div>
  );
};
