import { memo } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

interface EmptyStateProps {
  cardTypeFilter: 'ALL' | 'TASK' | 'INSIGHT' | 'DECISION';
  onModalOpen: () => void;
  onSmartComposeOpen: () => void;
}

const EmptyState = memo(function EmptyState({
  cardTypeFilter,
  onModalOpen,
  onSmartComposeOpen
}: EmptyStateProps) {
  return (
    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
      <p className="text-lg font-medium">
        {cardTypeFilter === 'ALL' ? 'No context cards found' : `No ${cardTypeFilter.toLowerCase()} cards found`}
      </p>
      <p className="text-sm mb-4">
        {cardTypeFilter === 'ALL' 
          ? 'Create your first context card for this project!' 
          : `Try switching to a different card type or create a new ${cardTypeFilter.toLowerCase()} card.`
        }
      </p>
      <div className="flex items-center justify-center space-x-2">
        <Button variant="secondary" onClick={onSmartComposeOpen}>
          ✨ Smart Compose
        </Button>
        <Button onClick={onModalOpen}>
          <Plus className="h-4 w-4 mr-2" />
          Add Context Card
        </Button>
      </div>
    </div>
  );
});

export default EmptyState;