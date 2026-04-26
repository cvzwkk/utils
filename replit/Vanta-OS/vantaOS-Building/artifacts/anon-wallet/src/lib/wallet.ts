import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";
import { Buffer } from "buffer";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

export interface AddressInfo {
  address: string;
  path: string;
  isChange: boolean;
  index: number;
}

export interface DerivedAccount {
  xpub: string;
  xprv: string;
  receive: AddressInfo[];
  change: AddressInfo[];
}

export function generateMnemonic(strength: number = 256): string {
  return bip39.generateMnemonic(strength);
}

export function mnemonicToSeed(mnemonic: string, passphrase?: string): Buffer {
  return bip39.mnemonicToSeedSync(mnemonic, passphrase);
}

export function validateAddress(address: string): boolean {
  try {
    bitcoin.address.toOutputScript(address);
    return true;
  } catch (e) {
    return false;
  }
}

export function deriveAccount(seed: Buffer, purpose: number, accountIndex: number, network = bitcoin.networks.bitcoin): DerivedAccount {
  const root = bip32.fromSeed(seed, network);
  const coinType = network === bitcoin.networks.testnet ? 1 : 0;
  const accountPath = `m/${purpose}'/${coinType}'/${accountIndex}'`;
  const accountNode = root.derivePath(accountPath);

  const receive: AddressInfo[] = [];
  const change: AddressInfo[] = [];

  for (let i = 0; i < 5; i++) {
    const receiveNode = accountNode.derivePath(`0/${i}`);
    const changeNode = accountNode.derivePath(`1/${i}`);

    let receiveAddress, changeAddress;

    if (purpose === 44) {
      receiveAddress = bitcoin.payments.p2pkh({ pubkey: receiveNode.publicKey, network }).address!;
      changeAddress = bitcoin.payments.p2pkh({ pubkey: changeNode.publicKey, network }).address!;
    } else if (purpose === 49) {
      receiveAddress = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: receiveNode.publicKey, network }),
        network
      }).address!;
      changeAddress = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: changeNode.publicKey, network }),
        network
      }).address!;
    } else { // 84
      receiveAddress = bitcoin.payments.p2wpkh({ pubkey: receiveNode.publicKey, network }).address!;
      changeAddress = bitcoin.payments.p2wpkh({ pubkey: changeNode.publicKey, network }).address!;
    }

    receive.push({ address: receiveAddress, path: `${accountPath}/0/${i}`, isChange: false, index: i });
    change.push({ address: changeAddress, path: `${accountPath}/1/${i}`, isChange: true, index: i });
  }

  return {
    xpub: accountNode.neutered().toBase58(),
    xprv: accountNode.toBase58(),
    receive,
    change
  };
}

export function buildMultisig(m: number, n: number, pubkeysHex: string[], network = bitcoin.networks.bitcoin) {
  const pubkeys = pubkeysHex.map(hex => Buffer.from(hex, 'hex'));
  
  const p2ms = bitcoin.payments.p2ms({ m, pubkeys, network });
  const p2wsh = bitcoin.payments.p2wsh({ redeem: p2ms, network });
  
  return {
    address: p2wsh.address,
    redeemScriptHex: p2ms.output?.toString('hex'),
    witnessScriptHex: p2ms.output?.toString('hex'),
  };
}
