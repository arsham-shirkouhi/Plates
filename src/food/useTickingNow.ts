import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const TICK_MS = 15_000;

/** Updates about every 15s so "0m" / "1m" labels keep moving, and immediately when the app is foregrounded. */
export function useTickingNow(): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const tick = () => setNow(Date.now());
        const id = setInterval(tick, TICK_MS);
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') tick();
        });
        return () => {
            clearInterval(id);
            sub.remove();
        };
    }, []);

    return now;
}
