'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CertificateSchema,
  type CertificateFormValues,
} from '@/packages/operacional/schemas/Document/DocumentCertificateSchema';

export function useCertificateFormHook() {
  return useForm<CertificateFormValues>({
    resolver: zodResolver(CertificateSchema),
    defaultValues: { password: '' },
  });
}
