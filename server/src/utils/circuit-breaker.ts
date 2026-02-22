interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  totalTrips: number;
}

const circuits = new Map<string, CircuitState>();

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60_000; // 5 min cooldown when open

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback?: () => T | Promise<T>,
): Promise<T> {
  let circuit = circuits.get(name);
  if (!circuit) {
    circuit = { failures: 0, lastFailure: 0, state: 'closed', totalTrips: 0 };
    circuits.set(name, circuit);
  }

  if (circuit.state === 'open') {
    const elapsed = Date.now() - circuit.lastFailure;
    if (elapsed < COOLDOWN_MS) {
      const remaining = Math.round((COOLDOWN_MS - elapsed) / 1000);
      console.warn(`[CB] ${name}: OPEN (${remaining}s remaining), serving fallback`);
      if (fallback) return fallback();
      throw new Error(`Circuit ${name} is open`);
    }
    circuit.state = 'half-open';
    console.log(`[CB] ${name}: trying half-open`);
  }

  try {
    const result = await fn();
    if (circuit.state === 'half-open') {
      console.log(`[CB] ${name}: half-open SUCCESS, closing circuit`);
    }
    circuit.failures = 0;
    circuit.state = 'closed';
    return result;
  } catch (err) {
    circuit.failures++;
    circuit.lastFailure = Date.now();
    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = 'open';
      circuit.totalTrips++;
      console.error(`[CB] ${name}: OPENED after ${circuit.failures} failures (trip #${circuit.totalTrips})`);
    }
    if (fallback) return fallback();
    throw err;
  }
}

export function getCircuitStates(): Record<string, { state: string; failures: number; totalTrips: number }> {
  const result: Record<string, { state: string; failures: number; totalTrips: number }> = {};
  for (const [name, circuit] of circuits) {
    result[name] = { state: circuit.state, failures: circuit.failures, totalTrips: circuit.totalTrips };
  }
  return result;
}

export function resetCircuit(name: string): void {
  circuits.delete(name);
}
