import { memo } from 'react';
import ContextCard from './ContextCard';
import { ContextCardWithRelations } from "@/interfaces/context-cards";

interface ContextCardGridProps {
  cards: ContextCardWithRelations[];
  onCardClick: (card: ContextCardWithRelations) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeColor: (type: string) => string;
  formatDate: (dateString: string | Date) => string;
}

const ContextCardGrid = memo(function ContextCardGrid({
  cards,
  onCardClick,
  getTypeIcon,
  getTypeColor,
  formatDate
}: ContextCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card) => (
        <ContextCard
          key={card.id}
          card={card}
          onCardClick={onCardClick}
          getTypeIcon={getTypeIcon}
          getTypeColor={getTypeColor}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
});

export default ContextCardGrid;