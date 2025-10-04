"use client";
import { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/ui";
import { 
  Pin, 
  Link, 
  Eye, 
  EyeOff, 
  Archive, 
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import { ContextCardWithRelations } from "@/interfaces/context-cards";

interface VirtualizedCardListProps {
  cards: ContextCardWithRelations[];
  onCardClick: (card: ContextCardWithRelations) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeColor: (type: string) => string;
  formatDate: (dateString: string | Date) => string;
}

// Memoized virtualized card component for large lists
const VirtualizedContextCard = memo(function VirtualizedContextCard({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    cards: ContextCardWithRelations[];
    onCardClick: (card: ContextCardWithRelations) => void;
    getTypeIcon: (type: string) => React.ReactNode;
    getTypeColor: (type: string) => string;
    formatDate: (dateString: string | Date) => string;
  };
}) {
  const { cards, onCardClick, getTypeIcon, getTypeColor, formatDate } = data;
  const card = cards[index];
  
  const handleClick = useCallback(() => {
    onCardClick(card);
  }, [card, onCardClick]);
  
  if (!card) return null;

  return (
    <div style={style} className="px-4 py-2">
      <Card
        className={cn(
          "cursor-pointer group hover:shadow-lg dark:hover:shadow-blue-900 transition-shadow rounded-xl border p-4 hover:border-blue-500 hover:scale-[1.01] transform",
          card.isArchived && "opacity-60",
          card.isPinned && "ring-2 ring-blue-200 dark:ring-blue-700"
        )}
        onClick={handleClick}
      >
        <CardHeader className="pb-3 mb-2">
          <div className="flex items-start justify-between space-y-0">
            <div className="flex items-center space-x-3 flex-1">
              <div className={cn("flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs", getTypeColor(card.type))}>
                {getTypeIcon(card.type)}
                <span className="capitalize">{card.type.toLowerCase()}</span>
              </div>
              {card.isPinned && (
                <Pin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              )}
              {card.isArchived && (
                <Archive className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500">
              {card.visibility === 'PRIVATE' ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4 text-green-500 dark:text-green-400" />
              )}
            </div>
          </div>
          
          <CardTitle className="text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
            {card.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p className="text-muted-foreground dark:text-muted-foreground-dark line-clamp-3">
            {card.content}
          </p>
          
          {card.why && (
            <div className="bg-yellow-50 dark:bg-yellow-900 p-2 rounded-md">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-100">Why:</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-200 line-clamp-2">{card.why}</p>
            </div>
          )}
          
          {card.issues && (
            <div className="bg-red-50 dark:bg-red-900 p-2 rounded-md flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-800 dark:text-red-100">Issues:</p>
                <p className="text-xs text-red-700 dark:text-red-200 line-clamp-2">{card.issues}</p>
              </div>
            </div>
          )}
          
          {card.linkedCard && (
            <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded-md flex items-center space-x-2">
              <Link className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-xs font-medium text-blue-800 dark:text-blue-100">Linked to:</p>
                <p className="text-xs text-blue-700 dark:text-blue-200 line-clamp-1">{card.linkedCard.title}</p>
              </div>
            </div>
          )}
          
          {card.linkedFrom && card.linkedFrom.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {card.linkedFrom.length} card{card.linkedFrom.length !== 1 ? 's' : ''} linked to this
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1">
            {card.attachments && card.attachments.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Paperclip className="h-3 w-3" />
                <span>{card.attachments.length} attachment{card.attachments.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Updated {formatDate(card.updatedAt)}</span>
            <span>Created {formatDate(card.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

const VirtualizedCardList = memo(function VirtualizedCardList({
  cards,
  onCardClick,
  getTypeIcon,
  getTypeColor,
  formatDate
}: VirtualizedCardListProps) {
  const virtualizationData = {
    cards,
    onCardClick,
    getTypeIcon,
    getTypeColor,
    formatDate,
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900">
      <List
        height={600}
        width="100%"
        itemCount={cards.length}
        itemSize={280}
        itemData={virtualizationData}
        overscanCount={5}
      >
        {VirtualizedContextCard}
      </List>
    </div>
  );
});

export default VirtualizedCardList;