// Real deployed BSC testnet addresses, verified against
// bnb-chain/stockanalyst-agent-demo's buyer-client (their own official
// reference) -- not guessed. Same U_TOKEN address bag init prints when
// scaffolding a seller agent, which cross-checked cleanly.
export const CONTRACTS = {
  CHAIN_ID: 97,
  COMMERCE: '0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de',
  ROUTER: '0xd7d36d66d2f1b608a0f943f722d27e3744f66f25',
  POLICY: '0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6',
  U_TOKEN: '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565',
} as const;

export const JOB_STATUS: Record<number, string> = {
  0: 'OPEN',
  1: 'FUNDED',
  2: 'SUBMITTED',
  3: 'COMPLETED',
  4: 'REJECTED',
  5: 'EXPIRED',
};
