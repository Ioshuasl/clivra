'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AnamnesisFormCreateSchema,
  newAnamnesisQuestion,
  type AnamnesisFormCreateFormValues,
} from '@/packages/admin/schemas/AnamnesisForm/AnamnesisFormSchema';

export function useAnamnesisFormFormHook(defaults?: AnamnesisFormCreateFormValues) {
  return useForm<AnamnesisFormCreateFormValues>({
    resolver: zodResolver(AnamnesisFormCreateSchema),
    defaultValues: defaults ?? {
      name: '',
      questions: [newAnamnesisQuestion()],
    },
  });
}
