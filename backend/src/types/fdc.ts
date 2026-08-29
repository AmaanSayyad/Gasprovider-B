/**
 * FDC (Flare Data Connector) type definitions
 */

export type AttestationType = 'EVMTransaction' | 'Payment';
export type AttestationStatus = 'pending' | 'requested' | 'finalized' | 'verified' | 'failed';

export interface AttestationRequest {
  attestationType: AttestationType;
  sourceChain: string;
  transactionHash: string;
  requiredConfirmations: number;
}

export interface AttestationResponse {
  roundId: number;
  abiEncodedRequest: string;
  status: 'VALID' | 'INVALID';
}

export interface AttestationProof {
  response: {
    attestationType: string;
    sourceId: string;
    votingRound: number;
    lowestUsedTimestamp: number;
    requestBody: any;
    responseBody: any;
  };
  proof: string[];
}

export interface PreparedRequest {
  abiEncodedRequest: string;
  status: string;
}

export interface ProofResponse {
  proof: string[];
  response: {
    attestationType: string;
    sourceId: string;
    votingRound: number;
    lowestUsedTimestamp: number;
    requestBody: any;
    responseBody: any;
  };
}
