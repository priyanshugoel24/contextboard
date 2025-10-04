"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useDebounce } from "@/hooks";
import { paginationConfig } from '@/config/pagination';
import { FileText, Folder, User, Tag, Search, Loader2, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/ui";
import { SearchService } from "@/services";
import { SearchResult } from "@/services/search.service";

interface AIMetadata {
  scope: string;
  teamsAnalyzed?: number;
  projectsAnalyzed: number;
  cardsAnalyzed: number;
  relevantProjects?: unknown[];
  relevantTeams?: unknown[];
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const debounced = useDebounce(query, paginationConfig.searchDebounceDelay);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const [aiMetadata, setAIMetadata] = useState<AIMetadata | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((item: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (item.type === "project") {
      router.push(`/projects/${item.slug}`);
    } else if (item.type === "team") {
      router.push(`/team/${item.slug}`);
    } else if (item.type === "card" && item.projectSlug) {
      router.push(`/projects/${item.projectSlug}?card=${item.originalId || item.id}`);
    } else if (item.type === "member" && item.projectSlug) {
      router.push(`/projects/${item.projectSlug}`);
    } else if (item.type === "tag" && item.projectSlug) {
      router.push(`/projects/${item.projectSlug}#tags`);
    }
  }, [router]);

  // Handle search result hover - prefetch relevant routes
  const handleResultHover = useCallback((item: SearchResult) => {
    if (item.type === "project") {
      router.prefetch(`/projects/${item.slug}`);
      router.prefetch(`/projects/${item.slug}/analytics`);
    } else if (item.type === "team") {
      router.prefetch(`/team/${item.slug}`);
      router.prefetch(`/team/${item.slug}/analytics`);
      router.prefetch(`/team/${item.slug}/settings`);
    } else if (item.type === "card" && item.projectSlug) {
      router.prefetch(`/projects/${item.projectSlug}`);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isLoading) return;
    
    setSubmitted(true);
    setIsLoading(true);
    setError(null);
    setSelectedIndex(-1);
    setAIResponse(null);
    setAIMetadata(null);
    
    try {
      if (isAIEnabled) {
        const aiResponse = await SearchService.askAI(query);
        setAIResponse(aiResponse.answer);
        setAIMetadata(aiResponse.metadata as unknown as AIMetadata || null);
      } else {
        const searchResponse = await SearchService.search(query);
        setResults(searchResponse.results || []);
      }
    } catch (error: unknown) {
      console.error("Search/AI failed:", error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Something went wrong. Please try again.";
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, isAIEnabled, isLoading]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          } else if (isAIEnabled || query.trim()) {
            // Submit the query if in AI mode or if there's a query
            handleSubmit();
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          setQuery("");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelect, isAIEnabled, query, handleSubmit]);

  // Add keyboard shortcut for AI toggle inside a useEffect
  useEffect(() => {
    const toggleAI = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      if ((isMac && e.metaKey && e.key === "i") || (!isMac && e.ctrlKey && e.key === "i")) {
        e.preventDefault();
        setIsAIEnabled((prev) => !prev);
      }
    };
    document.addEventListener("keydown", toggleAI);
    return () => document.removeEventListener("keydown", toggleAI);
  }, []);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setSelectedIndex(-1);
      setAIResponse(null);
      setAIMetadata(null);
      setSubmitted(false);
      return;
    }

    // Only auto-search for regular search, not AI
    if (!isAIEnabled) {
      const fetchResults = async () => {
        setIsLoading(true);
        setError(null);
        setSelectedIndex(-1);
        setAIResponse(null);
        setAIMetadata(null);
        setSubmitted(false);
        try {
          const searchResponse = await SearchService.search(debounced);
          setResults(searchResponse.results || []);
        } catch (error: unknown) {
          console.error("Search failed:", error);
          const errorMessage = error instanceof Error && 'response' in error && 
            typeof error.response === 'object' && error.response !== null &&
            'data' in error.response && typeof error.response.data === 'object' &&
            error.response.data !== null && 'error' in error.response.data
            ? String(error.response.data.error)
            : "Something went wrong. Please try again.";
          setError(errorMessage);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchResults();
    } else {
      // For AI mode, clear any previous results and just wait for user to submit
      setResults([]);
      setError(null);
      setAIResponse(null);
      setAIMetadata(null);
      setIsLoading(false);
      setSubmitted(false);
    }
  }, [debounced, isAIEnabled]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setIsOpen(false);
    setSelectedIndex(-1);
    setAIResponse(null);
    setAIMetadata(null);
    setSubmitted(false);
  };

  const grouped = {
    team: results.filter((r) => r.type === "team"),
    project: results.filter((r) => r.type === "project"),
    card: results.filter((r) => r.type === "card"),
    member: results.filter((r) => r.type === "member"),
    tag: results.filter((r) => r.type === "tag"),
  };

  const hasResults = Object.values(grouped).some(group => group.length > 0);

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder={
            isAIEnabled
              ? "Ask AI anything about your context... (Press Enter to submit)"
              : "Search projects and cards..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isAIEnabled && query.trim()) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className={cn(
            "block w-full pl-10 pr-20 py-3 text-sm rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
            isAIEnabled
              ? "border-yellow-500 dark:border-yellow-500"
              : ""
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {isAIEnabled && query.trim() && !isLoading && (
            <button
              onClick={handleSubmit}
              className="p-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              title="Submit AI Query"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={() => setIsAIEnabled((prev) => !prev)}
            className={cn(
              "p-1 rounded-md border transition-colors hover:scale-105 active:scale-95 duration-150 ease-in-out",
              isAIEnabled
                ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            )}
            title="Toggle Context-Aware AI (Cmd ⌘ + I / Ctrl + I)"
          >
            <Sparkles className="h-4 w-4" />
          </button>

          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
          )}
          {query && !isLoading && (
            <button
              onClick={clearSearch}
              className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {isAIEnabled ? "Getting AI response..." : "Searching..."}
              </span>
            </div>
          ) : !query.trim() ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {isAIEnabled 
                ? "Type your question and press Enter or click the submit button to get AI insights..."
                  : "Start typing to search projects and cards..."
              }
            </div>
          ) : !hasResults && !isAIEnabled ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          ) : isAIEnabled && !aiResponse && !submitted ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Press Enter or click the submit button to get AI insights about &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {grouped.team.length > 0 && (
                <div className="px-2 py-1">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Teams
                  </h3>
                  <div className="mt-1">
                    {grouped.team.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => handleResultHover(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md transition-colors",
                          selectedIndex === results.indexOf(item)
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
                          <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.title || item.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Team • {item.projectCount || 0} projects
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {grouped.project.length > 0 && (
                <div className="px-2 py-1">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Projects
                  </h3>
                  <div className="mt-1">
                    {grouped.project.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => handleResultHover(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md transition-colors",
                          selectedIndex === results.indexOf(item)
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                          <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Project
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {grouped.card.length > 0 && (
                <div className="px-2 py-1">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Context Cards
                  </h3>
                  <div className="mt-1">
                    {grouped.card.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => handleResultHover(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md transition-colors",
                          selectedIndex === results.indexOf(item)
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50 flex-shrink-0">
                          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            in {item.projectName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {grouped.member.length > 0 && (
                <div className="px-2 py-1">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Members
                  </h3>
                  <div className="mt-1">
                    {grouped.member.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md transition-colors",
                          selectedIndex === results.indexOf(item)
                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50 flex-shrink-0">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.email} • {item.projectName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {grouped.tag.length > 0 && (
                <div className="px-2 py-1">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tags
                  </h3>
                  <div className="mt-1">
                    {grouped.tag.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md transition-colors",
                          selectedIndex === results.indexOf(item)
                            ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50 flex-shrink-0">
                          <Tag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.tag}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            in {item.projectName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* AI Response Block */}
          {isOpen && isAIEnabled && aiResponse && (
            <div className="mt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    AI Assistant Response
                  </span>
                  {aiMetadata && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-800/50 px-2 py-1 rounded-full">
                      {aiMetadata.scope} • {aiMetadata.teamsAnalyzed || 0} teams • {aiMetadata.projectsAnalyzed} projects • {aiMetadata.cardsAnalyzed} cards
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {aiResponse}
                </div>
                {aiMetadata?.relevantProjects && aiMetadata.relevantProjects.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">
                      Relevant projects identified:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiMetadata.relevantProjects.map((project: unknown, index: number) => (
                        <span
                          key={index}
                          className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-md"
                          title={`${(project as { reason?: string; score?: number }).reason || 'Relevant project'} (Score: ${(project as { reason?: string; score?: number }).score?.toFixed(2) || 'N/A'})`}
                        >
                          {(project as { name: string }).name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiMetadata?.relevantTeams && aiMetadata.relevantTeams.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">
                      Relevant teams identified:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiMetadata.relevantTeams.map((team: unknown, index: number) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md"
                          title={`${(team as { reason?: string; score?: number }).reason || 'Relevant team'} (Score: ${(team as { reason?: string; score?: number }).score?.toFixed(2) || 'N/A'})`}
                        >
                          {(team as { name: string }).name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}