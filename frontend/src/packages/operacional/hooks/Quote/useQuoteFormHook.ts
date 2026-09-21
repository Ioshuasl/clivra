'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  QuoteCreateFormSchema,
  QuoteItemAddFormSchema,
  QuoteUpdateFormSchema,
  type QuoteCreateFormValues,
  type QuoteItemAddFormValues,
  type QuoteUpdateFormValues,
} from '@/packages/operacional/schemas/Quote/QuoteSchema';

const emptyItem: QuoteCreateFormValues['items'][number] = {
  procedureId: '',
  toothCode: '',
  face: '',
  quantity: 1,
  discountCents: 0,
};

export function useQuoteCreateFormHook(patientId?: string) {
  return useForm<QuoteCreateFormValues>({
    resolver: zodResolver(QuoteCreateFormSchema),
    defaultValues: {
      patientId: patientId ?? '',
      professionalId: '',
      validUntil: '',
      notes: '',
      discountReais: '0',
      items: [emptyItem],
    },
  });
}

export function useQuoteUpdateFormHook() {
  return useForm<QuoteUpdateFormValues>({
    resolver: zodResolver(QuoteUpdateFormSchema),
    defaultValues: {
      validUntil: '',
      notes: '',
      discountReais: '0',
    },
  });
}

export function useQuoteItemAddFormHook() {
  return useForm<QuoteItemAddFormValues>({
    resolver: zodResolver(QuoteItemAddFormSchema),
    defaultValues: emptyItem,
  });
}
