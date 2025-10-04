'use client';

import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContextCardForm } from "@/components/forms";
import { ContextCardModalProps } from "@/interfaces/ui-components";

const ContextCardModal = memo(function ContextCardModal({
  open,
  setOpen,
  projectSlug,
  existingCard,
  onSuccess,
}: ContextCardModalProps) {
  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-background rounded-xl shadow-xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-semibold">
            {existingCard ? 'Edit Context Card' : 'Create New Context Card'}
          </DialogTitle>
        </DialogHeader>
        
        <ContextCardForm 
          projectSlug={projectSlug || ""} 
          existingCard={existingCard}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
});

export default ContextCardModal;
