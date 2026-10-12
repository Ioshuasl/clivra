'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  subscriptionCheckoutSchema,
  type SubscriptionCheckoutFormValues,
} from '@/packages/admin/schemas/Subscription/SubscriptionCheckoutSchema';

export function useSubscriptionCheckoutFormHook() {
  return useForm<SubscriptionCheckoutFormValues>({
    resolver: zodResolver(subscriptionCheckoutSchema),
    defaultValues: { planCode: '', billingMethod: 'PIX', cpfCnpj: '' },
    mode: 'onSubmit',
  });
}
