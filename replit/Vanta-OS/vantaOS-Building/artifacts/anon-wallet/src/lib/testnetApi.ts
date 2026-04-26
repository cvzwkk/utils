const BASE_URL = 'https://mempool.space/testnet/api';

export async function getAddressInfo(address: string) {
  const res = await fetch(`${BASE_URL}/address/${address}`);
  if (!res.ok) throw new Error('Failed to fetch address info');
  return res.json();
}

export async function getAddressTxs(address: string) {
  const res = await fetch(`${BASE_URL}/address/${address}/txs`);
  if (!res.ok) throw new Error('Failed to fetch txs');
  return res.json();
}

export async function getAddressUtxos(address: string) {
  const res = await fetch(`${BASE_URL}/address/${address}/utxo`);
  if (!res.ok) throw new Error('Failed to fetch utxos');
  return res.json();
}

export async function broadcastTx(hex: string) {
  const res = await fetch(`${BASE_URL}/tx`, {
    method: 'POST',
    body: hex
  });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}
