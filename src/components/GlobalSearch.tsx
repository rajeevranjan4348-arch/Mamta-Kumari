import React, { useState, useEffect, useRef } from 'react';
import { RiSearchLine, RiCloseLine, RiStickyNoteLine, RiTaskLine, RiApps2Line, RiTerminalBoxLine } from 'react-icons/ri';
import { APPS } from '../views/Apps';

interface SearchResult {
  id: string;
  type: 'note' | 'task' | 'app' | 'chat';
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function GlobalSearch({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!isOpen) return;
    const handleNavigation = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].onClick();
        }
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const searchResults: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      try {
        // Search Apps
        APPS.forEach(app => {
          if (app.name.toLowerCase().includes(lowerQuery) || app.description.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
              id: `app_${app.id}`,
              type: 'app',
              title: app.name,
              description: app.description,
              icon: <RiApps2Line />,
              onClick: () => {
                onNavigate('APPS');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('iris-search-apps', { detail: app.name }));
                }, 100);
                setIsOpen(false);
              }
            });
          }
        });

        // Search Notes
        const notesRaw = localStorage.getItem('iris_notes');
        if (notesRaw) {
          const notes = JSON.parse(notesRaw);
          notes.forEach((note: any) => {
            if (note.title?.toLowerCase().includes(lowerQuery) || note.content?.toLowerCase().includes(lowerQuery)) {
              searchResults.push({
                id: `note_${note.id}`,
                type: 'note',
                title: note.title || 'Untitled Note',
                description: (note.content || '').substring(0, 100) + '...',
                icon: <RiStickyNoteLine />,
                onClick: () => {
                  onNavigate('MEMORY');
                  setIsOpen(false);
                }
              });
            }
          });
        }

        // Search Tasks
        const tasksRaw = localStorage.getItem('iris_tasks');
        if (tasksRaw) {
          const tasks = JSON.parse(tasksRaw);
          tasks.forEach((task: any) => {
            if (task.title?.toLowerCase().includes(lowerQuery) || task.description?.toLowerCase().includes(lowerQuery)) {
              searchResults.push({
                id: `task_${task.id}`,
                type: 'task',
                title: task.title || 'Untitled Task',
                description: task.description || '',
                icon: <RiTaskLine />,
                onClick: () => {
                  onNavigate('TASKS');
                  setIsOpen(false);
                }
              });
            }
          });
        }

        // Search Chat History
        const chatRaw = localStorage.getItem('rishi_chat_sessions');
        if (chatRaw) {
          const sessions = JSON.parse(chatRaw);
          sessions.forEach((session: any) => {
            let matchFound = false;
            let matchedText = '';
            
            // Check summary
            if (session.summary?.toLowerCase().includes(lowerQuery)) {
              matchFound = true;
              matchedText = session.summary;
            } else {
              // Check messages
              for (const msg of session.messages || []) {
                if (msg.content?.toLowerCase().includes(lowerQuery)) {
                  matchFound = true;
                  matchedText = msg.content;
                  break;
                }
              }
            }

            if (matchFound) {
              searchResults.push({
                id: `chat_${session.id}`,
                type: 'chat',
                title: session.summary || `Chat from ${new Date(session.timestamp).toLocaleDateString()}`,
                description: matchedText.substring(0, 100) + '...',
                icon: <RiTerminalBoxLine />,
                onClick: () => {
                  onNavigate('CHAT');
                  setIsOpen(false);
                }
              });
            }
          });
        }

      } catch (error) {
        console.error("Search error:", error);
      }

      setResults(searchResults);
      setIsSearching(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, onNavigate]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <RiSearchLine size={16} />
        <span className="hidden md:inline text-xs font-medium tracking-widest">SEARCH</span>
        <span className="hidden md:inline text-[10px] opacity-70 ml-2 border border-zinc-600 px-1.5 py-0.5 rounded font-mono bg-white/5">⌘K</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-[90%] max-w-2xl bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col z-[201] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-4 border-b border-white/10 bg-black/20">
              <RiSearchLine size={20} className="text-emerald-500 mr-3" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search apps, notes, tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-600"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white transition-colors">
                  <RiCloseLine size={20} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[60vh]">
              {isSearching ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Searching...</div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={result.onClick}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-start gap-4 px-4 py-3 transition-colors text-left ${index === selectedIndex ? 'bg-zinc-800 border-l-2 border-emerald-500' : 'hover:bg-zinc-800 border-l-2 border-transparent'}`}
                    >
                      <div className="p-2 bg-black/40 rounded-lg text-emerald-500 shrink-0">
                        {result.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">{result.title}</span>
                        <span className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{result.description}</span>
                      </div>
                      <div className="ml-auto flex items-center self-center text-xs text-zinc-600 uppercase font-mono tracking-widest shrink-0">
                        {result.type}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No results found for "{query}"</div>
              ) : (
                <div className="p-8 text-center text-zinc-600 text-sm flex flex-col items-center gap-3">
                  <RiSearchLine size={32} className="text-zinc-700" />
                  <span>Type to start searching across IRIS</span>
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-white/5 bg-black/40 text-xs text-zinc-500 flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <span className="flex items-center gap-1.5"><kbd className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded font-mono">↑</kbd> <kbd className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded font-mono">↓</kbd> to navigate</span>
                 <span className="flex items-center gap-1.5"><kbd className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded font-mono">↵</kbd> to select</span>
               </div>
               <span className="flex items-center gap-1.5"><kbd className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded font-mono">esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

