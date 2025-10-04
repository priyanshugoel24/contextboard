"use client";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import axios from "axios";
import { 
  Archive,
  FileText,
  Lightbulb,
  CheckCircle,
  Plus,
  Filter
} from "lucide-react";
import { ContextCardListProps } from '@/interfaces/ui-components';
import { ProjectData } from '@/interfaces/projects';

// Lazy load heavy modal components
const ContextCardModal = dynamic(() => import('./modals/ContextCardModal'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const SmartComposeModal = dynamic(() => import('./modals/SmartComposeModal'), {
  loading: () => <div>Loading AI composer...</div>
});

// Dynamically import components for progressive enhancement
const ContextCardGrid = dynamic(() => import('./ContextCardGrid'), {
  ssr: true 
});

const VirtualizedCardList = dynamic(() => import('./VirtualizedCardList'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const EmptyState = dynamic(() => import('./EmptyState'), {
  ssr: true 
});
import { useProjectRealtime } from "@/lib/ably/useProjectRealtime";
import { ContextCardWithRelations } from "@/interfaces/context-cards";
import { cardConfig } from '@/config/cards';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ErrorBoundary from './ErrorBoundary';

const ContextCardList = memo(function ContextCardList({ 
  projectSlug, 
  initialCards = [], 
  project: initialProject
}: ContextCardListProps) {
  // Remove hydration flags - use progressive enhancement instead
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ContextCardWithRelations | null>(null);
  const [project, setProject] = useState<ProjectData | null>(initialProject || null);
  const [showArchived, setShowArchived] = useState(false);
  const [allCards, setAllCards] = useState<ContextCardWithRelations[]>(
    Array.isArray(initialCards) ? initialCards : []
  );
  const [smartComposeOpen, setSmartComposeOpen] = useState(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<'ALL' | 'TASK' | 'INSIGHT' | 'DECISION'>('ALL');
  
  // Progressive enhancement for virtualization
  const [enableVirtualization, setEnableVirtualization] = useState(false);

  // Memoize utility functions to prevent recreation on every render
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'INSIGHT': return <Lightbulb className="h-4 w-4" />;
      case 'DECISION': return <CheckCircle className="h-4 w-4" />;
      case 'TASK': 
      default: return <FileText className="h-4 w-4" />;
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'INSIGHT': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
      case 'DECISION': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
      case 'TASK': 
      default: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100';
    }
  }, []);

  const formatDate = useCallback((dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // format for showing dates
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    try {
      return date.toLocaleDateString('en-US', options);
    } catch {
      // Fallback for invalid dates
      return 'Invalid date';
    }
  }, []);

  // Memoize card sorting function
  const sortCards = useCallback((cards: ContextCardWithRelations[]) => {
    return [...cards].sort((a, b) => {
      const aOrder = cardConfig.typeOrder[a.type as keyof typeof cardConfig.typeOrder] ?? 3;
      const bOrder = cardConfig.typeOrder[b.type as keyof typeof cardConfig.typeOrder] ?? 3;
      return aOrder - bOrder;
    });
  }, []);

  // Memoize filtered and sorted cards
  const displayedCards = useMemo(() => {
    // Ensure allCards is always an array to prevent filter errors
    const cardsArray = Array.isArray(allCards) ? allCards : [];
    let filtered = showArchived ? cardsArray : cardsArray.filter(card => !card.isArchived);
    
    // Apply type filter
    if (cardTypeFilter !== 'ALL') {
      filtered = filtered.filter(card => card.type === cardTypeFilter);
    }
    
    // Sort the cards
    return sortCards(filtered);
  }, [allCards, showArchived, cardTypeFilter, sortCards]);

  // Enable virtualization progressively after component mounts
  useEffect(() => {
    if (displayedCards.length > 50) {
      setEnableVirtualization(true);
    }
  }, [displayedCards.length]);

  // Memoize card click handler
  const handleCardClick = useCallback((card: ContextCardWithRelations) => {
    setSelectedCard(card);
    setModalOpen(true);
  }, []);

  // Memoize modal open handler
  const handleModalOpen = useCallback(() => {
    setModalOpen(true);
  }, []);

  // Memoize smart compose handler
  const handleSmartComposeOpen = useCallback(() => {
    setSmartComposeOpen(true);
  }, []);

  // Memoize filter handlers
  const handleArchiveToggle = useCallback(() => {
    setShowArchived(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((filter: 'ALL' | 'TASK' | 'INSIGHT' | 'DECISION') => {
    setCardTypeFilter(filter);
  }, []);

  // Memoize refresh function
  const refreshCards = useCallback(async () => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/context-cards?projectId=${project.id}&limit=100`);
      // The API returns { cards: [...] }, so we need to access the cards property
      const updatedCards: ContextCardWithRelations[] = response.data.cards || [];
      setAllCards(updatedCards);
    } catch (error) {
      console.error('Error refreshing cards:', error);
      // Fallback to page reload only if API call fails
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  const handleCardCreated = useCallback(() => {
    refreshCards();
  }, [refreshCards]);

  // Update cards when initialCards prop changes
  useEffect(() => {
    setAllCards(Array.isArray(initialCards) ? initialCards : []);
  }, [initialCards]);

  // Update project when initialProject prop changes
  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
    }
  }, [initialProject]);

  // Real-time updates using Ably
  useProjectRealtime(
    project?.id || null,
    () => {
      refreshCards();
    },
    () => {
      refreshCards();
    },
    (deletedCardId) => {
      setAllCards(prevCards => prevCards.filter(card => card.id !== deletedCardId));
    },
    () => {
      // Handle activity updates if needed
    }
  );

  if (loading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
        <p className="mt-2">Loading context cards...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Always show the header with filters and buttons */}
        <div className="flex items-center justify-between mb-6 mt-4 gap-6">
          <h2 className="text-2xl font-extrabold dark:text-gray-100">Context Cards</h2>
          <div className="flex items-center space-x-4">
            {/* Card Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  {cardTypeFilter === 'ALL' ? 'All Types' : cardTypeFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleFilterChange('ALL')}>
                  All Types
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('DECISION')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Decisions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('INSIGHT')}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Insights
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('TASK')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center space-x-1 text-xs"
              onClick={handleArchiveToggle}
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            {showArchived && Array.isArray(allCards) && allCards.some(card => card.isArchived) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {allCards.filter(card => card.isArchived).length} archived cards
              </span>
            )}
            <Button 
              variant="secondary" 
              onClick={handleSmartComposeOpen}
            >
              ✨ Smart Compose
            </Button>
            <Button className="cursor-pointer" onClick={handleModalOpen}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>

        {/* Conditional content: either cards or empty state */}
        {displayedCards.length === 0 ? (
          <EmptyState 
            cardTypeFilter={cardTypeFilter}
            onModalOpen={handleModalOpen}
            onSmartComposeOpen={handleSmartComposeOpen}
          />
        ) : enableVirtualization ? (
          <VirtualizedCardList
            cards={displayedCards}
            onCardClick={handleCardClick}
            getTypeIcon={getTypeIcon}
            getTypeColor={getTypeColor}
            formatDate={formatDate}
          />
        ) : (
          <ContextCardGrid
            cards={displayedCards}
            onCardClick={handleCardClick}
            getTypeIcon={getTypeIcon}
            getTypeColor={getTypeColor}
            formatDate={formatDate}
          />
        )}
      </div>
      {/* Always render modal if modalOpen is true and no card is selected */}
      {modalOpen && !selectedCard && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Unable to load card editor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an error loading the card creation form.
                </p>
                <Button onClick={() => setModalOpen(false)}>Close</Button>
              </div>
            </div>
          }
        >
          <ContextCardModal 
            open={modalOpen} 
            setOpen={setModalOpen} 
            projectSlug={projectSlug}
            onSuccess={handleCardCreated}
          />
        </ErrorBoundary>
      )}
      {/* Smart Compose Modal */}
      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">AI Composer Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The AI composer is currently unavailable. Please try again later.
              </p>
              <Button onClick={() => setSmartComposeOpen(false)}>Close</Button>
            </div>
          </div>
        }
      >
        <SmartComposeModal
          open={smartComposeOpen}
          setOpen={setSmartComposeOpen}
          projectSlug={projectSlug ?? ""}
          onSuccess={handleCardCreated}
        />
      </ErrorBoundary>
      {/* Render modal for editing/viewing a card */}
      {selectedCard && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Unable to load card</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There was an error loading the card details.
                </p>
                <Button onClick={() => setSelectedCard(null)}>Close</Button>
              </div>
            </div>
          }
        >
          <ContextCardModal 
            open={!!selectedCard}
            setOpen={(val: boolean) => {
              if (!val) {
                setSelectedCard(null);
                // Ensure add card modal doesn't appear after closing existing card modal
                setModalOpen(false);
              }
            }}
            projectSlug={projectSlug}
            existingCard={selectedCard as unknown as ContextCardWithRelations}
            onSuccess={() => {
              setSelectedCard(null);
              setModalOpen(false); // Ensure add card modal doesn't appear
              refreshCards();
            }}
          />
        </ErrorBoundary>
      )}
    </>
  );
});

export default ContextCardList;