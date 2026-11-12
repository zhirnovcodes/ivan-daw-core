// Contract C1: Web Plugin API v2 types.
// Copied from the "Types" section of docs/plugin-api.md (Claude Doc "Web Plugin API & Chain Connectors").
// The only change is the `export` keyword on each declaration. Change the doc first, then this file.

export type PluginKind = 'instrument' | 'effect' | 'midi' | 'modulator' | 'utility'
export type Feature = 'state' | 'presets' | 'sample-accurate' | 'latency' | 'tail'

export interface PluginManifest {
  id: string                 // stable reverse-DNS: 'com.beatality.beatality'
  name: string; vendor: string
  version: string            // plugin semver
  apiVersion: 2
  kind: PluginKind
  ports: PortInfo[]          // fixed for the instance's life
  ui: { width: number; height: number; resizable: boolean } | null   // CSS px
  features: Feature[]
}

export interface PluginFactory {    // default export of the plugin module; host lists modules in /plugins/catalog.json, loads via import()
  readonly manifest: PluginManifest
  create(host: HostContext, container: HTMLElement | null): Promise<PluginInstance>
}

export interface HostContext {
  readonly audioContext: AudioContext
  readonly apiVersion: 2
  readonly slotId: string                       // unique in project
  transport(): TransportState                   // latest state, beat computed at currentTime of the call
  notify(level: 'info' | 'warning' | 'error', message: string): void
  markDirty(): void                             // project now unsaved
  assetUrl(path: string): string                // resolved against the module URL
}

export interface PluginInstance {
  readonly ports: ReadonlyMap<string, PortHandle>
  readonly latency: number                      // s of added delay
  readonly tail: number                         // s of sound after input stops
  parameters(): ParameterInfo[]
  parameter(id: string): number                 // normalized 0..1
  schedule(events: PluginEvent[]): void         // event input
  listen(l: (e: PluginEvent) => void): () => void          // event output
  subscribe(l: (c: ParameterChange) => void): () => void
  getState(): Promise<PluginState>
  setState(s: PluginState): Promise<void>
  mount(container: HTMLElement): void
  unmount(): void
  suspend(): void
  resume(): void
  dispose(): void
}

export type PortInfo =
  | { id: string; label: string; kind: 'audio'; direction: 'in' | 'out'; channels: 1 | 2; main: boolean }
  | { id: string; label: string; kind: 'events'; direction: 'in' | 'out'; accepts: EventType[] }
  | { id: string; label: string; kind: 'modulation'; direction: 'out' }

export type PortHandle =
  | { info: PortInfo & { kind: 'audio' }; node: AudioNode; index: number }   // host: out.node.connect(in.node, out.index, in.index)
  | { info: PortInfo & { kind: 'events' | 'modulation' } }                     // host: listen() → schedule()

export type EventType = 'midi' | 'automation' | 'tempo' | 'transport'
export type PluginEvent = (
  | { type: 'midi'; time: number; bytes: [number, number, number] }        // raw MIDI channel message
  | { type: 'automation'; time: number; id: string; value: number;          // value 0..1
      source?: 'host' | 'binding' | 'clip' }
  | { type: 'tempo'; time: number; bpm: number }
  | { type: 'transport'; time: number; state: TransportState }
) & { port?: string }                                                       // omitted = main port

export interface TransportState {
  playing: boolean; bpm: number
  beat: number                                  // beats from project start at event.time
  numerator: number; denominator: number
  loop: { start: number; end: number } | null   // beats
}

export interface ParameterInfo {
  id: string                                    // stable forever (projects, bindings)
  label: string
  kind: 'float' | 'int' | 'boolean' | 'choice' | 'trigger'
  min: number; max: number; default: number     // default in min..max
  unit?: string
  scale?: 'linear' | 'log'                      // default linear
  choices?: string[]                            // labels for min..max
  group?: string
  automatable: boolean
  format?: (value: number) => string            // value in min..max
}

export interface ParameterChange {
  id: string; value: number                     // normalized
  gesture?: 'begin' | 'end'                     // frames a drag = one undo step
  source: 'ui' | 'host' | 'binding' | 'internal'
}

export interface PluginState {
  pluginId: string; pluginVersion: string
  data: unknown                                 // plugin-owned JSON, plugin-versioned
  files?: Record<string, Blob>                  // samples, IRs
}
