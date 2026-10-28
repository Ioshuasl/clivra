import type { UseFormReturn } from 'react-hook-form';
import type { AnamnesisFormCreateFormValues } from '@/packages/admin/schemas/AnamnesisForm/AnamnesisFormSchema';

export type AnamnesisQuestionCardProps = {
  form: UseFormReturn<AnamnesisFormCreateFormValues>;
  index: number;
  total: number;
  active: boolean;
  onActivate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};
