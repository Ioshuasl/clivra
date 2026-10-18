'use client';

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { publicQueryKeys } from '@/packages/public/helpers/PublicQueryKeys';
import { BookingAvailabilityGetService } from '@/packages/public/services/Booking/BookingAvailabilityGetService';
import type {
  BookingAvailability,
  BookingAvailabilityDay,
} from '@/packages/public/types/Booking/BookingTypes';

function mergeAvailabilityDays(
  results: Array<BookingAvailability | undefined>,
): BookingAvailabilityDay[] {
  const byDate = new Map<string, BookingAvailabilityDay>();

  for (const result of results) {
    if (!result) continue;
    for (const day of result.days) {
      const current = byDate.get(day.date);
      if (!current) {
        byDate.set(day.date, {
          ...day,
          slots: day.slots.map((slot) => ({ ...slot })),
        });
        continue;
      }
      const slotByStart = new Map(current.slots.map((slot) => [slot.startsAt, slot]));
      for (const slot of day.slots) {
        const existing = slotByStart.get(slot.startsAt);
        if (!existing) {
          slotByStart.set(slot.startsAt, { ...slot });
          continue;
        }
        if (slot.available && !existing.available) {
          slotByStart.set(slot.startsAt, { ...slot });
        }
      }
      current.slots = Array.from(slotByStart.values()).sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      );
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function useBookingAvailabilityGetHook(input: {
  slug: string;
  professionalIds: string[];
  from: string;
  to: string;
  enabled?: boolean;
}) {
  const professionalIds = input.professionalIds;
  const enabled =
    Boolean(input.enabled ?? true) &&
    Boolean(input.slug && input.from && input.to && professionalIds.length > 0);

  const queries = useQueries({
    queries: professionalIds.map((professionalId) => ({
      queryKey: publicQueryKeys.availability(
        input.slug,
        professionalId,
        input.from,
        input.to,
      ),
      queryFn: () =>
        BookingAvailabilityGetService({
          slug: input.slug,
          professionalId,
          from: input.from,
          to: input.to,
        }),
      enabled,
    })),
  });

  const resultsUpdatedAt = queries.map((query) => query.dataUpdatedAt).join('|');
  const resultsData = queries.map((query) => query.data);

  const data = useMemo((): BookingAvailability | undefined => {
    if (!enabled) return undefined;
    const ready = resultsData.filter(Boolean) as BookingAvailability[];
    if (ready.length === 0) return undefined;
    return {
      timezone: ready[0]!.timezone,
      days: mergeAvailabilityDays(ready),
    };
    // resultsUpdatedAt estabiliza o memo quando os dados das queries mudam
  }, [enabled, resultsUpdatedAt]);

  const slotOwners = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < professionalIds.length; i += 1) {
      const professionalId = professionalIds[i]!;
      const days = resultsData[i]?.days ?? [];
      for (const day of days) {
        for (const slot of day.slots) {
          if (slot.available && !map.has(slot.startsAt)) {
            map.set(slot.startsAt, professionalId);
          }
        }
      }
    }
    return map;
  }, [professionalIds, resultsUpdatedAt]);

  return {
    data,
    slotOwners,
    isLoading: enabled && queries.some((query) => query.isLoading || query.isFetching),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.error)?.error,
    refetch: async () => {
      await Promise.all(queries.map((query) => query.refetch()));
    },
  };
}
