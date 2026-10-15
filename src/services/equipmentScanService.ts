import { supabase, isSupabaseConfigured } from './supabase';

export type EquipmentScanResult = {
    candidates: string[];
    observedText?: string;
};

export class EquipmentScanError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EquipmentScanError';
    }
}

async function edgeFunctionMessage(error: unknown): Promise<string | null> {
    if (!error || typeof error !== 'object' || !('context' in error)) return null;
    const context = (error as { context?: unknown }).context;
    if (!context || typeof context !== 'object' || !('clone' in context)) return null;
    const response = context as Response;
    const payload = await response.clone().json().catch(() => null) as { error?: unknown } | null;
    return typeof payload?.error === 'string' ? payload.error : null;
}

/**
 * Identifies text or a clearly recognizable exercise machine. Returned names
 * are only search hints; they are resolved against WorkoutX before display.
 */
export async function scanExerciseEquipment(imageDataUrl: string): Promise<EquipmentScanResult> {
    if (!isSupabaseConfigured()) {
        throw new EquipmentScanError('Supabase is not configured on this device.');
    }
    if (!imageDataUrl.startsWith('data:image/')) {
        throw new EquipmentScanError('Please take a clear photo of the machine or its instruction placard.');
    }

    const { data, error } = await supabase.functions.invoke<EquipmentScanResult & { error?: string }>(
        'equipment-scan',
        { body: { imageDataUrl } },
    );
    if (error) {
        throw new EquipmentScanError(
            (await edgeFunctionMessage(error)) ?? 'Equipment scanning is unavailable. Please try again shortly.',
        );
    }
    if (!data || !Array.isArray(data.candidates)) {
        throw new EquipmentScanError(data?.error ?? 'The equipment scan returned an invalid result.');
    }

    return {
        candidates: data.candidates
            .filter((candidate): candidate is string => typeof candidate === 'string')
            .map((candidate) => candidate.trim())
            .filter(Boolean)
            .slice(0, 3),
        observedText: typeof data.observedText === 'string' ? data.observedText.trim() : undefined,
    };
}
