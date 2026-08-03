import { useEffect, useRef } from 'react';
import { powersync } from '../powersync/system';
import { SNAG_SELECT, mapSnagRow } from '../powersync/useSnags';
import { useNetworkStatus } from '../useNetworkStatus';
import { useProjectsStore } from '../../store/projectsStore';
import type { ProjectSnag } from '../../store/projectsStore';
import { supabase } from '../supabase';
import {
  isCandidateEligible,
  selectNextCandidate,
  buildSuccessPatch,
  buildFailurePatch,
} from './enrichmentQueue';

const CANDIDATE_SQL = `SELECT ${SNAG_SELECT} FROM snags WHERE ai_status IN ('pending', 'failed', 'running') OR (ai_status IS NULL AND description = 'Pending analysis')`;

function buildContextString(snag: ProjectSnag): string | undefined {
  const parts: string[] = [];
  if (snag.floor !== undefined && snag.floor !== null) {
    parts.push(`Floor ${snag.floor}`);
  }
  if (snag.flat) {
    parts.push(`Flat ${snag.flat}`);
  }
  if (snag.room) {
    parts.push(snag.room);
  }
  if (snag.areaType && snag.areaType !== 'unit') {
    parts.push(snag.areaType);
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

async function invokeAIWithTimeout(
  functionName: string,
  payload: any,
  ms = 45000
): Promise<{ data: any; error: any }> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('AI is taking too long to respond. Please try again.'));
    }, ms);
  });

  try {
    return await Promise.race([
      supabase.functions.invoke(functionName, { body: payload }),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export function useEnrichmentWorker() {
  const { isOffline } = useNetworkStatus();
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (__DEV__) {
      console.log('[enrich] worker mounted.');
      console.log(`[enrich] sql=${CANDIDATE_SQL}`);
    }

    const processNext = async () => {
      if (__DEV__) {
        console.log(`[enrich] tick isOffline=${isOffline} inFlight=${isProcessingRef.current}`);
      }

      if (!isMountedRef.current || isOffline || isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      try {
        const rows = await powersync.getAll<any>(CANDIDATE_SQL);

        if (!isMountedRef.current) return;

        const now = Date.now();
        const snags = rows.map((r: any) => mapSnagRow(r));
        const eligibleCount = snags.filter((s: any) => isCandidateEligible(s, now)).length;
        const candidate = selectNextCandidate(snags, now);

        if (__DEV__) {
          console.log(`[enrich] rows=${rows.length} candidates=${eligibleCount}`);
          if (candidate) {
            console.log(
              `[enrich] selected id=${candidate.id} attempts=${candidate.aiAttempts ?? 0} aiStatus=${candidate.aiStatus ?? 'undefined'} photos=${candidate.photos?.length ?? 0}`
            );
          }
        }

        if (!candidate || !isMountedRef.current) {
          return;
        }

        const { updateSnag } = useProjectsStore.getState();

        // Mark candidate as running
        await updateSnag(candidate.id, {
          aiStatus: 'running',
          aiUpdatedAt: new Date().toISOString(),
        });

        if (!isMountedRef.current) return;

        let rawImage = candidate.photos[1] ?? candidate.photos[0];
        if (rawImage && !rawImage.startsWith('data:')) {
          rawImage = `data:image/jpeg;base64,${rawImage}`;
        }

        const context = buildContextString(candidate);
        const payload = {
          base64Image: rawImage,
          context,
        };

        if (__DEV__) {
          console.log(`[enrich] invoking id=${candidate.id}`);
        }

        let responseData: any = null;
        let responseError: any = null;
        const startTime = Date.now();

        try {
          const res = await invokeAIWithTimeout('ai-snag-from-photo', payload);
          responseData = res.data;
          responseError = res.error;
        } catch (err: any) {
          responseError = err;
        }

        const elapsedMs = Date.now() - startTime;

        if (!isMountedRef.current) return;

        const isOk = !responseError && !responseData?.error && !!responseData?.snag;
        const errMsg = responseError?.message || responseData?.error || (isOk ? '' : 'AI analysis failed');

        if (__DEV__) {
          if (isOk) {
            console.log(`[enrich] result id=${candidate.id} ok=true ms=${elapsedMs}`);
          } else {
            console.log(`[enrich] result id=${candidate.id} ok=false ms=${elapsedMs} error=${errMsg}`);
          }
        }

        if (!isOk) {
          const failurePatch = buildFailurePatch(candidate.aiAttempts ?? 0, errMsg);
          await updateSnag(candidate.id, {
            ...failurePatch,
            aiUpdatedAt: new Date().toISOString(),
          });
          if (__DEV__) {
            console.log(`[enrich] patched id=${candidate.id} aiStatus=failed`);
          }
        } else {
          const successPatch = buildSuccessPatch(responseData.snag);

          // Verify if description in DB is still 'Pending analysis'
          const currentRows = await powersync.getAll<any>(
            `SELECT description FROM snags WHERE id = ?`,
            [candidate.id]
          );
          const currentDesc = currentRows[0]?.description;
          const shouldUpdateDescription = currentDesc === 'Pending analysis';

          const finalPatch: Partial<ProjectSnag> = {
            ...successPatch,
            aiUpdatedAt: new Date().toISOString(),
          };

          if (!shouldUpdateDescription) {
            delete finalPatch.description;
          }

          await updateSnag(candidate.id, finalPatch);
          if (__DEV__) {
            console.log(`[enrich] patched id=${candidate.id} aiStatus=done`);
          }
        }
      } catch (error) {
        console.error('[useEnrichmentWorker] Error processing snag:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Run on startup / network status change
    processNext().catch(() => {});

    // Poll every 15 seconds
    const interval = setInterval(() => {
      processNext().catch(() => {});
    }, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [isOffline]);
}
