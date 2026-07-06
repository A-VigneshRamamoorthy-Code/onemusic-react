/** Audio file extensions OneMusic recognises when scanning OneDrive. */
export const AUDIO_EXTENSIONS = new Set<string>([
  'mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'wma', 'mpeg', 'mp4', 'm4b', 'alac',
]);

/** Delegated Microsoft Graph scopes required to read OneDrive audio. */
export const SCOPES = ['User.Read', 'Files.Read.All', 'offline_access'];

export const DEFAULT_CLIENT_ID = '61ca244b-acb8-4bba-b3bf-9829b60d9981';

// Use the multi-tenant "common" endpoint so personal Microsoft accounts resolve to
// their own consumer OneDrive. The org tenant 3ff6bc31-5c2f-4e94-86ea-8946fe39d617
// has no SharePoint/OneDrive (SPO) license, so /me/drive fails there ("Tenant does
// not have a SPO license."). Override with ?tenant=<id> if you need a specific tenant.
export const DEFAULT_TENANT_ID = 'common';

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export const FOLDER_PATH_STORAGE_KEY = 'onemusic.folderPath';

/** Prefix for the per-folder cached track list (persists the library across reloads). */
export const TRACKS_CACHE_PREFIX = 'onemusic.tracks.';

/**
 * How long a streamed OneDrive download URL is treated as valid before we re-resolve it.
 * The real URLs live ~1 hour; we refresh well before that.
 */
export const STREAM_URL_TTL_MS = 45 * 60 * 1000;

/** How many neighbours on each side of the active track to prefetch. */
export const PREFETCH_WINDOW = 2;

/** Maximum number of tracks kept in the "up next" queue. */
export const QUEUE_LIMIT = 8;
