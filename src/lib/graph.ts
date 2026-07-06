import { GRAPH_BASE } from '../config/constants';
import { buildTrackMetadata, isAudioFile } from '../utils/tracks';
import type { DriveChildrenResponse, DriveItem, Track } from '../types';

export type TrackBatchHandler = (batch: Track[]) => void;
export type ShouldStop = () => boolean;

// Request the audio facet (ID3 album/artist/title) plus the fields we need, and pull
// large pages so scans finish in fewer round-trips.
const CHILDREN_QUERY = '$select=id,name,folder,file,audio,parentReference&$top=200';

function withChildrenQuery(route: string): string {
  return route.includes('?') ? `${route}&${CHILDREN_QUERY}` : `${route}?${CHILDREN_QUERY}`;
}

/** Download the raw audio content for a track as a Blob. */
export async function fetchTrackContent(trackId: string, token: string): Promise<Blob> {
  const response = await fetch(`${GRAPH_BASE}/me/drive/items/${trackId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Audio download failed with status ${response.status}`);
  }
  return response.blob();
}

/**
 * Fetch a track's short-lived, pre-authenticated download URL. This URL supports HTTP
 * range requests and needs no auth header, so it can be used directly as an <audio>
 * `src` for instant, progressive streaming — no full-file download before playback.
 */
export async function getStreamUrl(trackId: string, token: string): Promise<string> {
  const response = await fetch(`${GRAPH_BASE}/me/drive/items/${trackId}?$select=id,@microsoft.graph.downloadUrl`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Could not resolve stream URL (status ${response.status})`);
  }
  const data = (await response.json()) as {
    '@microsoft.graph.downloadUrl'?: string;
    '@content.downloadUrl'?: string;
  };
  const url = data['@microsoft.graph.downloadUrl'] || data['@content.downloadUrl'];
  if (!url) {
    throw new Error('No streamable download URL for this track');
  }
  return url;
}

/**
 * Recursively scan a OneDrive folder, invoking `onBatch` with audio tracks as they
 * are discovered so the UI can stream results. Honours `@odata.nextLink` pagination
 * and stops early when `shouldStop` returns true.
 */
export async function walkDriveNode(
  route: string,
  token: string,
  onBatch: TrackBatchHandler,
  shouldStop: ShouldStop,
): Promise<void> {
  if (shouldStop()) {
    return;
  }
  let url = route.startsWith('http') ? route : `${GRAPH_BASE}${withChildrenQuery(route)}`;
  while (url) {
    if (shouldStop()) {
      return;
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      let detail = `status ${response.status}`;
      try {
        const errorBody = (await response.json()) as DriveChildrenResponse;
        if (errorBody?.error?.message) {
          detail = errorBody.error.message;
        }
      } catch {
        /* fall back to the status-based detail */
      }
      throw new Error(`OneDrive scan failed: ${detail}`);
    }

    const payload = (await response.json()) as DriveChildrenResponse;
    const children = payload.value || [];
    const foundHere: Track[] = [];
    const subfolders: DriveItem[] = [];

    for (const child of children) {
      if (child.folder) {
        subfolders.push(child);
      } else if (isAudioFile(child.name)) {
        foundHere.push(buildTrackMetadata(child));
      }
    }

    if (foundHere.length) {
      onBatch(foundHere);
    }

    for (const folder of subfolders) {
      await walkDriveNode(`/me/drive/items/${folder.id}/children`, token, onBatch, shouldStop);
    }

    url = payload['@odata.nextLink'] || '';
  }
}
