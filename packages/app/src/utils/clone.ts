/** Domain values are JSON serializable on both browser and Hermes runtimes. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
