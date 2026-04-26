export type BackendNodeName = 'tor' | 'i2pd' | 'yggdrasil' | 'freenet';
export type NodeStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'FAILED';

export interface NodeStatusItem {
  name: BackendNodeName;
  status: NodeStatus;
  pid: number | null;
  startedAt: number | null;
  uptimeMs: number;
  exitCode: number | null;
  exitSignal: string | null;
  error: string | null;
  ports: Record<string, number>;
  logTail: string[];
}

export interface NodeDetails extends NodeStatusItem {
  portChecks: Record<string, boolean>;
  extra: Record<string, unknown>;
}

const API = '/api';

export async function fetchAllStatus(): Promise<Record<BackendNodeName, NodeStatusItem>> {
  const res = await fetch(`${API}/nodes/status`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchDetails(name: BackendNodeName): Promise<NodeDetails> {
  const res = await fetch(`${API}/nodes/${name}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function startBackendNode(name: BackendNodeName): Promise<NodeStatusItem> {
  const res = await fetch(`${API}/nodes/${name}/start`, { method: 'POST' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function stopBackendNode(name: BackendNodeName): Promise<NodeStatusItem> {
  const res = await fetch(`${API}/nodes/${name}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export const UI_TO_BACKEND: Record<'tor' | 'i2p' | 'yggdrasil' | 'hyphanet', BackendNodeName> = {
  tor: 'tor',
  i2p: 'i2pd',
  yggdrasil: 'yggdrasil',
  hyphanet: 'freenet',
};
