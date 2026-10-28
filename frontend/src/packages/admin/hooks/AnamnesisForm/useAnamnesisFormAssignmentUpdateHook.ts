'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/packages/admin/helpers/AdminQueryKeys';
import { AnamnesisFormAssignmentUpdateService } from '@/packages/admin/services/AnamnesisForm/AnamnesisFormAssignmentUpdateService';

export function useAnamnesisFormAssignmentUpdateHook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AnamnesisFormAssignmentUpdateService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.anamnesisAssignments });
    },
  });
}
