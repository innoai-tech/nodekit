export function usePlugin(opts: {}): [string, any]

export function transform(code: string, opts: {
  env?: {
    targets?: string | { [K: string]: string }
    mode?: string,
    coreJs?: string,
  }
}): Promise<string>
