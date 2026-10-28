'use client';

import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { AnamnesisFormAssignmentListService } from '@/packages/admin/services/AnamnesisForm/AnamnesisFormAssignmentListService';

export function useAnamnesisFormAssignmentListHook() {
  return useQuery({
    queryKey: adminQueryKeys.anamnesisAssignments,
    queryFn: AnamnesisFormAssignmentListService,
  });
}
