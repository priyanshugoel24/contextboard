'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createContextCardAction, updateContextCardAction } from '@/actions/form-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  FileText, 
  Lightbulb, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  CircleCheck,
  Archive,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { ContextCardFormProps } from '@/interfaces/FormInterfaces';
import RichTextEditor from '@/components/RichTextEditor';
import { ContextCardService } from '@/services/contextCard.service';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Textarea } from '@/components/ui/textarea';
import { AtSign, ChevronDown } from 'lucide-react';
import Image from 'next/image';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isEditing ? 'Updating Card...' : 'Creating Card...'}
        </>
      ) : (
        isEditing ? 'Update Context Card' : 'Create Context Card'
      )}
    </Button>
  );
}

// Compact icon selection component
interface IconOptionProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}

function IconOption({ label, icon, isSelected, onClick, color }: IconOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-all hover:shadow-sm ${
        isSelected
          ? `${color} border-current`
          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="text-sm">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default function ContextCardForm({ projectSlug, existingCard, onSuccess }: ContextCardFormProps) {
  const isEditing = !!existingCard;
  const actionFunction = isEditing 
    ? updateContextCardAction.bind(null, existingCard!.id)
    : createContextCardAction;
  
  const [state, formAction] = useActionState(actionFunction, {});
  
  // Local state for form controls
  const [selectedType, setSelectedType] = useState(existingCard?.type || 'TASK');
  const [selectedVisibility, setSelectedVisibility] = useState(existingCard?.visibility || 'PRIVATE');
  const [selectedStatus, setSelectedStatus] = useState(existingCard?.status || 'ACTIVE');
  const [content, setContent] = useState(existingCard?.content || '');
  const [whyContent, setWhyContent] = useState(existingCard?.why || '');
  const [issuesContent, setIssuesContent] = useState(existingCard?.issues || '');
  const [selectedUserId, setSelectedUserId] = useState<string>(
    (existingCard && 'assignedTo' in existingCard && existingCard.assignedTo?.id) || ''
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Team members functionality
  const {
    teamMembers,
    filteredMembers,
    showMemberDropdown,
    setShowMemberDropdown,
    handleAssignmentSearch,
  } = useTeamMembers(projectSlug, true);

  // Debug: log team members data
  useEffect(() => {
    console.log('Team members:', teamMembers);
    console.log('Filtered members:', filteredMembers);
    console.log('Project Slug:', projectSlug);
  }, [teamMembers, filteredMembers, projectSlug]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMemberDropdown && !target.closest('[data-dropdown-container]')) {
        setShowMemberDropdown(false);
      }
    };

    if (showMemberDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMemberDropdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!existingCard?.id) return;
    
    if (!confirm('Are you sure you want to delete this context card? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await ContextCardService.deleteContextCard(existingCard.id);
      toast.success('Context card deleted successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to delete context card');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!existingCard?.id) return;
    
    const newArchivedState = !existingCard.isArchived;
    const action = newArchivedState ? 'archive' : 'unarchive';
    
    if (!confirm(`Are you sure you want to ${action} this context card?`)) {
      return;
    }

    setIsArchiving(true);
    try {
      await ContextCardService.archiveContextCard(existingCard.id, newArchivedState);
      toast.success(`Context card ${action}d successfully`);
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to ${action} context card`);
      console.error('Archive error:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const typeOptions = [
    {
      value: 'TASK',
      label: 'Task',
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    },
    {
      value: 'INSIGHT',
      label: 'Insight',
      icon: <Lightbulb className="h-4 w-4" />,
      color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
    },
    {
      value: 'DECISION',
      label: 'Decision',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    }
  ];

  const visibilityOptions = [
    {
      value: 'PRIVATE',
      label: 'Private',
      icon: <EyeOff className="h-4 w-4" />,
      color: 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
    },
    {
      value: 'PUBLIC',
      label: 'Public',
      icon: <Eye className="h-4 w-4" />,
      color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
    }
  ];

  const statusOptions = [
    {
      value: 'ACTIVE',
      label: 'Active',
      icon: <CircleCheck className="h-4 w-4" />,
      color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    },
    {
      value: 'CLOSED',
      label: 'Closed',
      icon: <Archive className="h-4 w-4" />,
      color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
    }
  ];

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="type" value={selectedType} />
        <input type="hidden" name="visibility" value={selectedVisibility} />
        <input type="hidden" name="status" value={selectedStatus} />
        <input type="hidden" name="content" value={content} />
        <input type="hidden" name="why" value={whyContent} />
        <input type="hidden" name="issues" value={issuesContent} />
        {selectedUserId && <input type="hidden" name="notifyUserId" value={selectedUserId} />}
        
        <div className="space-y-2">
          <Label htmlFor="title">Card Title *</Label>
          <Input
            id="title"
            name="title"
            placeholder="Enter card title"
            defaultValue={existingCard?.title || ''}
            required
            className="w-full"
          />
          {state.errors?.title && (
            <p className="text-sm text-red-500">{state.errors.title[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Enter card content..."
            className="w-full"
            minHeight={150}
          />
          {state.errors?.content && (
            <p className="text-sm text-red-500">{state.errors.content[0]}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Type *</Label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => (
                <IconOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  icon={option.icon}
                  color={option.color}
                  isSelected={selectedType === option.value}
                  onClick={() => setSelectedType(option.value as 'TASK' | 'INSIGHT' | 'DECISION')}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Visibility *</Label>
            <div className="flex flex-wrap gap-2">
              {visibilityOptions.map((option) => (
                <IconOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  icon={option.icon}
                  color={option.color}
                  isSelected={selectedVisibility === option.value}
                  onClick={() => setSelectedVisibility(option.value as 'PRIVATE' | 'PUBLIC')}
                />
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-3">
              <Label>Status *</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <IconOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    icon={option.icon}
                    color={option.color}
                    isSelected={selectedStatus === option.value}
                    onClick={() => setSelectedStatus(option.value as 'ACTIVE' | 'CLOSED')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Assignment/Tagging Section */}
        <div className="space-y-3">
          <Label>Assign to Team Member (Optional)</Label>
          <div className="relative" data-dropdown-container>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMemberDropdown(!showMemberDropdown);
              }}
              className="w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedUserId
                    ? teamMembers.find(m => m.userId === selectedUserId)?.name || 'Selected Member'
                    : 'Select a team member to assign'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Dropdown */}
            {showMemberDropdown && (
              <div 
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search team members..."
                    className="w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    onChange={(e) => handleAssignmentSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId('');
                      setShowMemberDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    No assignment
                  </button>
                  {filteredMembers.map((member) => (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserId(member.userId);
                        setShowMemberDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      {member.image && (
                        <Image
                          src={member.image}
                          alt={member.name || member.email || 'User'}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {member.name || member.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {member.email}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No team members found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="why">Why (Optional)</Label>
          <Textarea
            id="why"
            name="why"
            placeholder="Why is this important?"
            rows={3}
            value={whyContent}
            onChange={(e) => setWhyContent(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issues">Issues (Optional)</Label>
          <Textarea
            id="issues"
            name="issues"
            placeholder="Any issues or concerns?"
            rows={3}
            value={issuesContent}
            onChange={(e) => setIssuesContent(e.target.value)}
            className="w-full"
          />
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (Optional)</Label>
            <Input
              id="attachments"
              name="attachments"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.json,.md,.csv"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Max 10MB per file. Supported: images, PDFs, text files
            </p>
          </div>
        )}

        {isEditing && existingCard?.attachments && existingCard.attachments.length > 0 && (
          <div className="space-y-2">
            <Label>Current Attachments</Label>
            <div className="space-y-1">
              {existingCard.attachments.map((attachment: string, index: number) => (
                <div key={index} className="text-sm text-blue-600 hover:text-blue-800">
                  <a href={attachment} target="_blank" rel="noopener noreferrer">
                    {attachment.split('/').pop()}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <SubmitButton isEditing={isEditing} />
          
          {isEditing && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleArchive}
                disabled={isArchiving}
                className="flex-1 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
              >
                {isArchiving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {existingCard?.isArchived ? 'Unarchiving...' : 'Archiving...'}
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    {existingCard?.isArchived ? 'Unarchive Card' : 'Archive Card'}
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Card
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {state.message && !state.success && (
          <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {state.message}
          </div>
        )}
      </form>
    </div>
  );
}
