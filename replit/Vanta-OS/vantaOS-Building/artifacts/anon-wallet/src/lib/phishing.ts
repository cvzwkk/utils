export const PHISHING_DOMAINS = [
  'blocck.com',
  'binnance.com',
  'metamosk.io',
  'uphhold.com',
  'treazor.io',
  'coinbaise.com',
  'kraken-support.com',
  'mycrypto-wallet.com',
  'electrum-update.org',
  'blockstream.in',
  'mempool.spac',
  'localbitcoins-login.com',
  'paxful-secure.com',
  'bitfinex-verify.com',
  'gemini-auth.com',
  'bittrex-login.net',
  'huobi-support.com',
  'kucoin-secure.com',
  'okex-verify.com',
  'binance-auth.com',
  'trustwallet-update.com',
  'exodus-secure.com',
  'atomicwallet-update.com',
  'ledger-live.com',
  'trezor-wallet.io',
  'myetherwallet-verify.com',
  'metamask-auth.io',
  'pancakeswap-finance.com',
  'uniswap-exchange.com',
  'sushiswap-finance.com',
];

export function checkDomain(domain: string): 'SAFE' | 'SUSPICIOUS' | 'BLOCKED' {
  if (!domain) return 'SAFE';
  
  const normalized = domain.toLowerCase().trim();
  
  if (PHISHING_DOMAINS.some(phish => normalized.includes(phish))) {
    return 'BLOCKED';
  }
  
  // Basic heuristic: check for misspellings of common domains
  const sensitiveWords = ['binance', 'coinbase', 'kraken', 'trezor', 'ledger', 'metamask'];
  for (const word of sensitiveWords) {
    if (normalized.includes(word) && !normalized.endsWith(`.${word}.com`) && normalized !== `${word}.com`) {
      return 'SUSPICIOUS';
    }
  }
  
  return 'SAFE';
}
