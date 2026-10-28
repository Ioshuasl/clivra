'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  PatientEditSchema,
  patientToEditValues,
  type PatientEditFormValues,
} from '@/packages/clinico/schemas/Patient/PatientEditSchema';
import type { AttendancePatient } from '@/packages/clinico/types/Patient/PatientTypes';

export function usePatientEditFormHook(patient: AttendancePatient) {
  return useForm<PatientEditFormValues>({
    resolver: zodResolver(PatientEditSchema),
    defaultValues: patientToEditValues(patient),
  });
}
