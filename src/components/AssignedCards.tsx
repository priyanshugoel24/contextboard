"use client";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import dynamic from 'next/dynamic';
import { ContextCardWithRelations } from "@/interfaces/context-cards";
import { useSession } from "next-auth/react";
import { ContextCardService } from "@/services/contextCard.service";
import ErrorBoundary from './ErrorBoundary';

// Lazy load ContextCardModal
const ContextCardModal = dynamic(() => import('./modals/ContextCardModal'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

// Memoized card component to prevent unnecessary re-renders
const AssignedCard = memo(function AssignedCard({
  card,
  onCardClick,
  onToggleFocus,
  isSelected,
}: {
  card: ContextCardWithRelations;
  onCardClick: (card: ContextCardWithRelations) => void;
  onToggleFocus?: (card: ContextCardWithRelations) => void;
  isSelected: boolean;
}) {
  const handleClick = useCallback(() => {
    onCardClick(card);
  }, [card, onCardClick]);

  const handleToggleFocus = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFocus?.(card);
  }, [card, onToggleFocus]);

  return (
    <div
      className="min-w-[280px] max-w-[300px] my-2 first:ml-4 last:mr-4 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-700 rounded-xl shadow-md p-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all flex-shrink-0 relative group"
      style={{ scrollSnapAlign: "start" }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm truncate flex-1">{card.title}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${card.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{card.status}</span>
      </div>
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{card.type}</div>
      <div className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200 mb-3">{card.content}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {card.project && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-zinc-800 px-2 py-0.5 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
              {card.project.name}
            </span>
          )}
        </div>
        {onToggleFocus && (
          <button
            className={`text-xs px-2 py-1 rounded-md border shadow-sm ${
              isSelected
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-white text-gray-600 border-gray-300"
            } hover:bg-gray-100 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-600`}
            onClick={handleToggleFocus}
          >
            {isSelected ? "✔ Added" : "🎯 Add to Focus"}
          </button>
        )}
      </div>
    </div>
  );
});

const AssignedCards = memo(function AssignedCards({
  onToggleFocusCard,
  selectedCardIds = [],
  teamId,
  currentUserOnly = true,
}: {
  onToggleFocusCard?: (card: ContextCardWithRelations) => void;
  selectedCardIds?: string[];
  teamId?: string;
  currentUserOnly?: boolean;
}) {

  const { data: sessionData } = useSession();
  const userEmail = sessionData?.user?.email;
  const [cards, setCards] = useState<ContextCardWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ContextCardWithRelations | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  // Memoize visible cards to prevent unnecessary re-renders
  const visibleCards = useMemo(() => {
    return cards.filter(card => card.status === "ACTIVE");
  }, [cards]);

  // Memoize card click handler
  const handleCardClick = useCallback((card: ContextCardWithRelations) => {
    setSelectedCard(card);
    setModalOpen(true);
  }, []);

  // Fetch cards with pagination
  const fetchCards = useCallback(async (pageNum: number) => {
    if (isFetching.current || !userEmail) return;
    
    isFetching.current = true;
    setLoading(true);
    
    try {
      const { cards: newCards, hasMore: hasMoreCards } = await ContextCardService.fetchAssignedCards({
        pageNum,
        userEmail,
        teamId,
        currentUserOnly,
      });
      
      setCards((prev) => {
        const existingIds = new Set(prev.map(c => c.id));
        const filteredNewCards = newCards.filter((c: ContextCardWithRelations) => !existingIds.has(c.id));
        return [...prev, ...filteredNewCards];
      });
      setHasMore(hasMoreCards);
    } catch (error) {
      console.error("Error fetching assigned cards:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [userEmail, teamId, currentUserOnly]);

  useEffect(() => {
    if (userEmail) {
      setCards([]); // Reset cards when dependencies change
      setPage(0);
      fetchCards(0);
    }
  }, [userEmail, teamId, currentUserOnly, fetchCards]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || loading || !hasMore) return;
    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 100) {
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (page > 0) {
      fetchCards(page);
    }
  }, [page, fetchCards]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto py-4 custom-scrollbar bg-gradient-to-r from-blue-50/60 to-white dark:from-zinc-800 dark:to-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm"
        style={{ scrollSnapType: "x mandatory", minHeight: 200 }}
      >
        {visibleCards.length === 0 && !loading && (
          <div className="text-gray-400 px-6 py-8 text-center w-full">No active cards assigned to you.</div>
        )}
        {visibleCards.map((card) => (
          <AssignedCard
            key={card.id}
            card={card}
            onCardClick={handleCardClick}
            onToggleFocus={onToggleFocusCard}
            isSelected={selectedCardIds.includes(card.id)}
          />
        ))}
        {loading && (
          <div className="flex items-center justify-center min-w-[120px] px-4 text-gray-400 text-sm italic">Loading...</div>
        )}
      </div>
      {selectedCard && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Unable to load assigned card</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an error loading the card details.
                </p>
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <ContextCardModal
            open={modalOpen}
            setOpen={(val: boolean) => {
              setModalOpen(val);
              if (!val) setSelectedCard(null);
            }}
            projectSlug={selectedCard.project?.slug || ""}
            existingCard={selectedCard as unknown as ContextCardWithRelations}
            onSuccess={() => {
              setModalOpen(false);
              setSelectedCard(null);
              // Refresh cards if needed
              fetchCards(0);
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
});

export default AssignedCards;
