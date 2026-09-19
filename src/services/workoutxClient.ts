/**
 * Thin fetch client for the WorkoutX Exercise API.
 *
 * Base URL / key come from EXPO_PUBLIC_WORKOUTX_API_* env vars (see .env).
 * All calls include the X-WorkoutX-Key header, a request timeout, and
 * structured error handling so callers can safely fall back to local data.
 */
import {
    WorkoutXExercise,
    WorkoutXExerciseListResponse,
    WorkoutXBodyPart,
} from '../types/workoutx';

const DEFAULT_BASE_URL = 'https://api.workoutxapp.com/v1';
const DEFAULT_TIMEOUT_MS = 12_000;

const API_KEY = process.env.EXPO_PUBLIC_WORKOUTX_API_KEY ?? '';
const BASE_URL = process.env.EXPO_PUBLIC_WORKOUTX_API_BASE_URL ?? DEFAULT_BASE_URL;

let missingKeyLogged = false;

export class WorkoutXError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly kind: 'network' | 'timeout' | 'rate_limit' | 'auth' | 'http' | 'parse' = 'http'
    ) {
        super(message);
        this.name = 'WorkoutXError';
    }
}

export function isWorkoutXConfigured(): boolean {
    return API_KEY.length > 0;
}

function ensureConfigured(): boolean {
    if (API_KEY.length === 0) {
        if (!missingKeyLogged) {
            missingKeyLogged = true;
            console.warn(
                '[workoutxClient] EXPO_PUBLIC_WORKOUTX_API_KEY is not set — falling back to local exercise catalog. ' +
                    'Add it to .env and restart the Metro bundler with `expo start -c`.'
            );
        }
        return false;
    }
    return true;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = BASE_URL.replace(/\/$/, '');
    const clean = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${clean}`;
    if (!query) return url;
    const search = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && `${v}`.length > 0)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
    return search ? `${url}?${search}` : url;
}

async function fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
    // AbortController is available in RN 0.60+.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            method: 'GET',
            headers: {
                'X-WorkoutX-Key': API_KEY,
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
    } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
            throw new WorkoutXError(`Request timed out after ${timeoutMs}ms`, undefined, 'timeout');
        }
        throw new WorkoutXError(
            `Network error: ${(err as Error)?.message ?? 'unknown'}`,
            undefined,
            'network'
        );
    } finally {
        clearTimeout(timer);
    }
}

async function request<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    if (!ensureConfigured()) {
        throw new WorkoutXError('WorkoutX API key not configured', undefined, 'auth');
    }

    const url = buildUrl(path, query);
    const res = await fetchWithTimeout(url);

    if (res.status === 401 || res.status === 403) {
        throw new WorkoutXError(`WorkoutX auth rejected (${res.status})`, res.status, 'auth');
    }
    if (res.status === 429) {
        throw new WorkoutXError('WorkoutX rate limit hit (429)', 429, 'rate_limit');
    }
    if (!res.ok) {
        const body = await safeReadText(res);
        throw new WorkoutXError(
            `WorkoutX ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
            res.status,
            'http'
        );
    }

    try {
        return (await res.json()) as T;
    } catch (err) {
        throw new WorkoutXError(
            `Failed to parse WorkoutX response: ${(err as Error)?.message ?? 'unknown'}`,
            res.status,
            'parse'
        );
    }
}

async function safeReadText(res: Response): Promise<string> {
    try {
        return await res.text();
    } catch {
        return '';
    }
}

function unwrapList(payload: WorkoutXExerciseListResponse): WorkoutXExercise[] {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as { data: WorkoutXExercise[] }).data)) {
        return (payload as { data: WorkoutXExercise[] }).data;
    }
    if (payload && Array.isArray((payload as { exercises: WorkoutXExercise[] }).exercises)) {
        return (payload as { exercises: WorkoutXExercise[] }).exercises;
    }
    return [];
}

// -------------------------- public API --------------------------

/** GET /v1/exercises — paginated list of exercises. */
export async function fetchExercises(limit = 20, offset = 0): Promise<WorkoutXExercise[]> {
    const payload = await request<WorkoutXExerciseListResponse>('/exercises', { limit, offset });
    return unwrapList(payload);
}

/** GET /v1/exercises/bodyPart/{bodyPart} — exercises for one body part. */
export async function fetchExercisesByBodyPart(
    bodyPart: WorkoutXBodyPart | string,
    limit = 50,
    offset = 0
): Promise<WorkoutXExercise[]> {
    const path = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}`;
    const payload = await request<WorkoutXExerciseListResponse>(path, { limit, offset });
    return unwrapList(payload);
}

/** GET /v1/exercises/target/{target} — exercises for one target muscle. */
export async function fetchExercisesByTarget(
    target: string,
    limit = 50,
    offset = 0
): Promise<WorkoutXExercise[]> {
    const path = `/exercises/target/${encodeURIComponent(target)}`;
    const payload = await request<WorkoutXExerciseListResponse>(path, { limit, offset });
    return unwrapList(payload);
}

/** GET /v1/exercises/exercise/{id} — single exercise by id. */
export async function fetchExerciseById(id: string): Promise<WorkoutXExercise | null> {
    try {
        const payload = await request<WorkoutXExercise | { data: WorkoutXExercise }>(
            `/exercises/exercise/${encodeURIComponent(id)}`
        );
        if (!payload) return null;
        if ((payload as { data: WorkoutXExercise }).data) {
            return (payload as { data: WorkoutXExercise }).data;
        }
        return payload as WorkoutXExercise;
    } catch (err) {
        if (err instanceof WorkoutXError && err.status === 404) return null;
        throw err;
    }
}

/** GET /v1/exercises/name/{name} — search by name. */
export async function fetchExercisesByName(name: string): Promise<WorkoutXExercise[]> {
    const path = `/exercises/name/${encodeURIComponent(name)}`;
    const payload = await request<WorkoutXExerciseListResponse>(path);
    return unwrapList(payload);
}

/** GET /v1/exercises/bodyPartList — list of accepted body-part strings. */
export async function fetchBodyPartList(): Promise<string[]> {
    const payload = await request<string[] | { data: string[] }>('/exercises/bodyPartList');
    if (Array.isArray(payload)) return payload;
    return Array.isArray((payload as { data: string[] }).data)
        ? (payload as { data: string[] }).data
        : [];
}
