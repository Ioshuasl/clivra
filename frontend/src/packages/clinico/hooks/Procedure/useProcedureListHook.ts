'use client';

import { useQuery } from '@tanstack/react-query';
import { clinicoQueryKeys } from '@/packages/clinico/helpers/ClinicoQueryKeys';
import { ProcedureListService } from '@/packages/clinico/services/Procedure/ProcedureListService';

export function useProcedureListHook() {
  return useQuery({
    queryKey: clinicoQueryKeys.procedures,
    queryFn: ProcedureListService,
  });
}
