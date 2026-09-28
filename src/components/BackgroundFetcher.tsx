"use client";

import { useEffect, useRef } from 'react';
import { useFetchQueue } from '@/store/fetchQueueStore';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/lib/api';
import { useCacheStore } from '@/store/cacheStore';

export function BackgroundFetcher() {
  const queue = useFetchQueue();
  const trip = useTripStore();
  const cache = useCacheStore();
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const currentTaskPriorityRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize the background queue if there's a trip but the queue is empty
    if (trip.destination && trip.passengers.length > 0 && queue.tasks.length === 0) {
      queue.initBackgroundChecks(trip);
    }
  }, [trip.destination, trip.passengers.length, queue.tasks.length, queue]);

  useEffect(() => {
    // Check for preemption condition: a priority 0 task is idle, but a lower priority task is running
    if (isProcessingRef.current && abortControllerRef.current && currentTaskIdRef.current) {
      const nextTask = queue.tasks.find(t => t.status === 'idle');
      if (nextTask && nextTask.priority === 0 && (currentTaskPriorityRef.current ?? 1) > 0) {
        console.log(`[BackgroundFetcher] Preempting ${currentTaskIdRef.current} for high-priority task ${nextTask.id}`);
        abortControllerRef.current.abort();
        // The abort will throw in the catch block of processNext, which will reset the aborted task to 'idle'
      }
    }

    const processNext = async () => {
      if (isProcessingRef.current) return;
      
      const nextTask = queue.getNextTask();
      if (!nextTask) return; // Queue is empty or everything is done/loading

      isProcessingRef.current = true;
      currentTaskIdRef.current = nextTask.id;
      currentTaskPriorityRef.current = nextTask.priority;
      abortControllerRef.current = new AbortController();
      
      queue.updateTaskStatus(nextTask.id, 'loading');

      try {
        let result: any = null;
        const checkOnly = !nextTask.isLive;
        const signal = abortControllerRef.current.signal;

        // Execute API call based on category
        if (nextTask.category === 'transport' && nextTask.paxId && nextTask.subType) {
          const pax = trip.passengers.find(p => p.id === nextTask.paxId);
          if (pax && pax.city) {
            result = await api.getTransportOptions(pax.city, trip.destination, nextTask.subType, checkOnly, signal);
          }
        } else if (nextTask.category === 'places') {
          result = await api.getPlaces(trip.destination, undefined, undefined, undefined, checkOnly, signal);
        } else if (nextTask.category === 'food') {
          result = await api.getFood(trip.destination, undefined, undefined, undefined, checkOnly, signal);
        } else if (nextTask.category === 'hotels') {
          result = await api.getHotels(trip.destination, [], undefined, undefined, undefined, checkOnly, signal);
        }

        // Evaluate result
        if (!result || result.error) {
          queue.updateTaskStatus(nextTask.id, 'error');
        } else if (result.status === 'cache_miss') {
          // It was a background check, and it's not cached in DB
          queue.updateTaskStatus(nextTask.id, 'cache_miss');
        } else if (Array.isArray(result) || (result && !result.status)) {
          // Got a response (even if empty) — save to cache so UI can show empty state!
          queue.updateTaskStatus(nextTask.id, 'completed', result);
          
          let cacheKey: string = nextTask.category;
          if (nextTask.category === 'transport' && nextTask.paxId && nextTask.subType) {
            const pax = trip.passengers.find(p => p.id === nextTask.paxId);
            const paxCity = pax?.city || 'Unknown';
            const dest = trip.destination || 'Unknown';
            cacheKey = `${nextTask.paxId}-${paxCity}-${dest}-${nextTask.subType}-v10`;
          }
            
          cache.setCache(cacheKey, result);
        } else {
          queue.updateTaskStatus(nextTask.id, 'error');
        }

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log(`[BackgroundFetcher] Task ${nextTask.id} was aborted, returning to queue.`);
          queue.updateTaskStatus(nextTask.id, 'idle');
        } else {
          console.error(`[BackgroundFetcher] Failed task ${nextTask.id}`, err);
          queue.updateTaskStatus(nextTask.id, 'error');
        }
      } finally {
        isProcessingRef.current = false;
        currentTaskIdRef.current = null;
        currentTaskPriorityRef.current = null;
        abortControllerRef.current = null;
        // The useEffect will re-run automatically because queue state changed
      }
    };

    // Give priority to UI rendering by running this in an idle callback (or small timeout)
    const timer = setTimeout(processNext, 100);
    return () => clearTimeout(timer);
  }, [queue.tasks, queue, trip.passengers, trip.destination, cache]);

  return null; // Invisible global component
}
