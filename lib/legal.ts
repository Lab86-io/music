/**
 * Shared facts for the public legal pages (/privacy and /terms).
 * The Google and YouTube sentences are required wording; keep them verbatim.
 */

export const LEGAL_CONTACT_EMAIL = "jakob@lab86.io";
export const LEGAL_EFFECTIVE_DATE = "2026-09-29";
export const LEGAL_EFFECTIVE_DATE_LABEL = "September 29, 2026";

export const GOOGLE_API_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";
export const YOUTUBE_TERMS_URL = "https://www.youtube.com/t/terms";
export const GOOGLE_PRIVACY_POLICY_URL = "https://policies.google.com/privacy";
export const GOOGLE_PERMISSIONS_URL = "https://myaccount.google.com/permissions";
export const SPOTIFY_APPS_URL = "https://www.spotify.com/account/apps/";

/** Google API Services User Data Policy: required Limited Use disclosure. */
export const GOOGLE_LIMITED_USE_STATEMENT =
  "Lab86 Music's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.";

/** The OAuth scope that /api/youtube/auth requests (see lib/youtube-oauth.ts). */
export const YOUTUBE_OAUTH_SCOPE = "https://www.googleapis.com/auth/youtube";

export const LEGAL_ROUTES = ["/privacy", "/terms"] as const;
