// Real ABIs for BNB Chain's ERC-8183 (AgenticCommerce / APEX) stack, copied
// from bnb-chain/stockanalyst-agent-demo's buyer-client (their own official
// end-to-end reference) rather than reconstructed from the spec. This is a
// technical interface, not creative content -- correctness here means
// matching the deployed bytecode's actual signatures exactly.

export const COMMERCE_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'provider', type: 'address' },
      { internalType: 'address', name: 'evaluator', type: 'address' },
      { internalType: 'uint256', name: 'expiredAt', type: 'uint256' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'address', name: 'hook', type: 'address' },
    ],
    name: 'createJob',
    outputs: [{ internalType: 'uint256', name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bytes', name: 'optParams', type: 'bytes' },
    ],
    name: 'setBudget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'uint256', name: 'expectedBudget', type: 'uint256' },
      { internalType: 'bytes', name: 'optParams', type: 'bytes' },
    ],
    name: 'fund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'jobId', type: 'uint256' }],
    name: 'getJob',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'client', type: 'address' },
          { internalType: 'address', name: 'provider', type: 'address' },
          { internalType: 'address', name: 'evaluator', type: 'address' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'uint256', name: 'budget', type: 'uint256' },
          { internalType: 'uint256', name: 'expiredAt', type: 'uint256' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'address', name: 'hook', type: 'address' },
          { internalType: 'uint256', name: 'submittedAt', type: 'uint256' },
          { internalType: 'bytes32', name: 'deliverable', type: 'bytes32' },
        ],
        internalType: 'struct IACP.Job',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'client', type: 'address' },
      { indexed: true, internalType: 'address', name: 'provider', type: 'address' },
      { indexed: false, internalType: 'address', name: 'evaluator', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'expiredAt', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'hook', type: 'address' },
    ],
    name: 'JobCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'provider', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'deliverable', type: 'bytes32' },
    ],
    name: 'JobSubmitted',
    type: 'event',
  },
] as const;

export const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'address', name: 'policy', type: 'address' },
    ],
    name: 'registerJob',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { internalType: 'bytes', name: 'evidence', type: 'bytes' },
    ],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const POLICY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'jobId', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'deliverable', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'submittedAt', type: 'uint64' },
      { indexed: false, internalType: 'bytes', name: 'optParams', type: 'bytes' },
    ],
    name: 'JobInitialised',
    type: 'event',
  },
  {
    inputs: [],
    name: 'disputeWindow',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
