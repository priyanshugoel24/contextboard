// Form component prop interfaces
import { ExistingCard } from './context-cards';

export interface ProjectFormProps {
  teamId?: string;
  onSuccess?: () => void;
}

export interface SmartComposeFormProps {
  projectId: string;
  onSuccess?: () => void;
}

export interface InvitationFormProps {
  teamSlug: string;
  onSuccess?: () => void;
}

export interface TeamFormProps {
  onSuccess?: () => void;
}

export interface CommentFormProps {
  cardId: string;
  parentId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
}

export interface ContextCardFormProps {
  projectSlug: string;
  existingCard?: ExistingCard & { 
    createdById?: string;
    why?: string | null;
    issues?: string | null;
    attachments?: string[] | null;
    summary?: string | null;
    status?: "ACTIVE" | "CLOSED" | null;
  };
  onSuccess?: () => void;
}
