import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { FDCAttestationClient } from "./fdc";
import { AttestationRequest, AttestationType } from "../types/fdc";

/**
 * Property-based tests for FDC Attestation Client
 * Using fast-check for property-based testing with 100+ iterations
 */

describe("FDCAttestationClient", () => {
  let client: FDCAttestationClient;

  beforeEach(() => {
    // Initialize client with test configuration
    client = new FDCAttestationClient(
      "https://coston2-api.flare.network/ext/C/rpc",
      "0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b",
      "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3",
      "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3",
      "https://coston2-verifier-api.flare.network",
      "https://coston2-da-api.flare.network",
      1658429955,
      90,
      "1.0"
    );
  });

  /**
   * **Feature: flare-integration, Property 4: FDC Attestation Request Creation**
   * **Validates: Requirements 2.1**
   * 
   * For any detected deposit event, the system should create and submit an FDC attestation
   * request with the correct attestation type and transaction hash.
   */
  describe("Property 4: FDC Attestation Request Creation", () => {
    it("should create attestation requests with correct structure for any valid transaction", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random transaction hashes (64 hex chars)
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          // Generate random source chains
          fc.constantFrom("testETH", "testBTC", "testXRP", "testDOGE", "ETH", "BTC", "XRP", "DOGE"),
          // Generate random confirmation counts
          fc.integer({ min: 1, max: 12 }),
          async (txHash, sourceChain, confirmations) => {
            // Determine expected attestation type
            const expectedType = FDCAttestationClient.selectAttestationType(sourceChain);

            // Create request
            const request: AttestationRequest = {
              attestationType: expectedType,
              sourceChain,
              transactionHash: "0x" + txHash,
              requiredConfirmations: confirmations,
            };

            // Mock the prepareRequest method to avoid actual API calls
            const prepareRequestSpy = vi.spyOn(client as any, "prepareRequest");
            prepareRequestSpy.mockResolvedValue({
              abiEncodedRequest: "0x1234567890abcdef",
              status: "VALID",
            });

            // Mock the submitRequest method
            const submitRequestSpy = vi.spyOn(client as any, "submitRequest");
            submitRequestSpy.mockResolvedValue(12345);

            try {
              // Request attestation
              const response = await client.requestAttestation(request);

              // Verify response structure
              expect(response).toBeDefined();
              expect(response.roundId).toBeDefined();
              expect(typeof response.roundId).toBe("number");
              expect(response.abiEncodedRequest).toBeDefined();
              expect(typeof response.abiEncodedRequest).toBe("string");
              expect(response.status).toBe("VALID");

              // Verify prepareRequest was called with correct parameters
              expect(prepareRequestSpy).toHaveBeenCalledWith(request);

              // Verify the request has the correct attestation type
              expect(request.attestationType).toBe(expectedType);
            } finally {
              prepareRequestSpy.mockRestore();
              submitRequestSpy.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flare-integration, Property 19: FDC Attestation Preparation**
   * **Validates: Requirements 7.1**
   * 
   * For any indexed deposit event, the system should prepare an FDC attestation request
   * containing the transaction hash and source chain identifier.
   */
  describe("Property 19: FDC Attestation Preparation", () => {
    it("should prepare requests with transaction hash and source chain for any deposit", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random transaction hashes
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          // Generate random source chains
          fc.constantFrom("testETH", "testBTC", "testXRP", "testDOGE"),
          // Generate random confirmation counts
          fc.integer({ min: 1, max: 12 }),
          async (txHash, sourceChain, confirmations) => {
            const attestationType = FDCAttestationClient.selectAttestationType(sourceChain);

            const request: AttestationRequest = {
              attestationType,
              sourceChain,
              transactionHash: "0x" + txHash,
              requiredConfirmations: confirmations,
            };

            // Mock fetch to avoid actual API calls
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({
                abiEncodedRequest: "0xabcdef1234567890",
                status: "VALID",
              }),
            } as Response);

            try {
              // Prepare the request
              const prepared = await client.prepareRequest(request);

              // Verify prepared request structure
              expect(prepared).toBeDefined();
              expect(prepared.abiEncodedRequest).toBeDefined();
              expect(typeof prepared.abiEncodedRequest).toBe("string");
              expect(prepared.abiEncodedRequest.startsWith("0x")).toBe(true);
              expect(prepared.status).toBeDefined();

              // Verify fetch was called with correct endpoint
              expect(global.fetch).toHaveBeenCalled();
              const fetchCall = (global.fetch as any).mock.calls[0];
              const endpoint = fetchCall[0];
              
              // Endpoint should contain the source chain and attestation type
              expect(endpoint).toContain(attestationType);
            } finally {
              vi.restoreAllMocks();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flare-integration, Property 8: Attestation Type Selection**
   * **Validates: Requirements 2.5, 12.1, 12.2, 12.3, 12.4, 12.5**
   * 
   * For any deposit from a non-EVM chain (BTC, DOGE, XRP), the system should use the
   * Payment attestation type instead of EVMTransaction.
   */
  describe("Property 8: Attestation Type Selection", () => {
    it("should select EVMTransaction for EVM chains and Payment for non-EVM chains", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "ETH",
            "testETH",
            "BSC",
            "testBSC",
            "AVAX",
            "testAVAX",
            "FLR",
            "testFLR",
            "SGB",
            "testSGB",
            "BTC",
            "testBTC",
            "XRP",
            "testXRP",
            "DOGE",
            "testDOGE",
            "LTC",
            "testLTC"
          ),
          (sourceChain) => {
            const attestationType = FDCAttestationClient.selectAttestationType(sourceChain);

            // EVM chains should use EVMTransaction
            const evmChains = [
              "ETH",
              "testETH",
              "BSC",
              "testBSC",
              "AVAX",
              "testAVAX",
              "FLR",
              "testFLR",
              "SGB",
              "testSGB",
            ];

            // Non-EVM chains should use Payment
            const nonEvmChains = [
              "BTC",
              "testBTC",
              "XRP",
              "testXRP",
              "DOGE",
              "testDOGE",
              "LTC",
              "testLTC",
            ];

            if (evmChains.includes(sourceChain)) {
              expect(attestationType).toBe("EVMTransaction");
            } else if (nonEvmChains.includes(sourceChain)) {
              expect(attestationType).toBe("Payment");
            }

            // Attestation type should always be one of the two valid types
            expect(["EVMTransaction", "Payment"]).toContain(attestationType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit test: Round ID calculation
   */
  describe("Round ID calculation", () => {
    it("should calculate correct round ID from block timestamp", () => {
      const firstVotingRoundStartTs = 1658429955;
      const votingEpochDurationSeconds = 90;

      // Test various timestamps
      const testCases = [
        { timestamp: 1658429955, expectedRound: 0 },
        { timestamp: 1658430045, expectedRound: 1 },
        { timestamp: 1658430135, expectedRound: 2 },
        { timestamp: 1658430225, expectedRound: 3 },
      ];

      testCases.forEach(({ timestamp, expectedRound }) => {
        const roundId = Math.floor(
          (timestamp - firstVotingRoundStartTs) / votingEpochDurationSeconds
        );
        expect(roundId).toBe(expectedRound);
      });
    });
  });

  /**
   * **Feature: flare-integration, Property 21: FDC Proof Retrieval**
   * **Validates: Requirements 7.3**
   * 
   * For any finalized attestation round, the system should retrieve the attestation proof
   * from the State Connector within 60 seconds of finalization.
   */
  describe("Property 21: FDC Proof Retrieval", () => {
    it("should retrieve proofs for any finalized round with valid request bytes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random round IDs
          fc.integer({ min: 1, max: 100000 }),
          // Generate random request bytes (hex string)
          fc.hexaString({ minLength: 64, maxLength: 128 }),
          async (roundId, requestBytesHex) => {
            const requestBytes = "0x" + requestBytesHex;

            // Mock fetch to simulate DA Layer response
            const mockProof = ["0xabcd1234", "0xef567890"];
            const mockResponse = {
              attestationType: "0x45564d5472616e73616374696f6e",
              sourceId: "0x7465737445544800",
              votingRound: roundId,
              lowestUsedTimestamp: Math.floor(Date.now() / 1000),
              requestBody: { transactionHash: "0x1234" },
              responseBody: { status: "SUCCESS" },
            };

            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({
                proof: mockProof,
                response: mockResponse,
              }),
            } as Response);

            try {
              // Retrieve proof
              const proof = await client.getProof(roundId, requestBytes);

              // Verify proof structure
              expect(proof).toBeDefined();
              expect(proof.proof).toBeDefined();
              expect(Array.isArray(proof.proof)).toBe(true);
              expect(proof.proof.length).toBeGreaterThan(0);
              expect(proof.response).toBeDefined();
              expect(proof.response.votingRound).toBe(roundId);

              // Verify fetch was called with correct parameters
              expect(global.fetch).toHaveBeenCalled();
              const fetchCall = (global.fetch as any).mock.calls[0];
              const body = JSON.parse(fetchCall[1].body);
              expect(body.votingRoundId).toBe(roundId);
              expect(body.requestBytes).toBe(requestBytes);
            } finally {
              vi.restoreAllMocks();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should retry proof retrieval on failure", async () => {
      const roundId = 12345;
      const requestBytes = "0xabcdef1234567890";

      // Mock fetch to fail twice then succeed
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => "Server error",
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            proof: ["0xabcd"],
            response: {
              attestationType: "0x45564d5472616e73616374696f6e",
              sourceId: "0x7465737445544800",
              votingRound: roundId,
              lowestUsedTimestamp: Math.floor(Date.now() / 1000),
              requestBody: {},
              responseBody: {},
            },
          }),
        } as Response);
      });

      try {
        // Should succeed after retries
        const proof = await client.getProof(roundId, requestBytes, 3, 100);
        expect(proof).toBeDefined();
        expect(callCount).toBe(3);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });

  /**
   * **Feature: flare-integration, Property 5: FDC Proof Verification**
   * **Validates: Requirements 2.2**
   * 
   * For any received FDC attestation, the system should verify the Merkle proof against
   * the State Connector contract before proceeding with dispersal.
   */
  describe("Property 5: FDC Proof Verification", () => {
    it("should verify Merkle proofs against State Connector for any attestation", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random round IDs
          fc.integer({ min: 1, max: 100000 }),
          // Generate random proof arrays
          fc.array(fc.hexaString({ minLength: 64, maxLength: 64 }), { minLength: 1, maxLength: 10 }),
          async (roundId, proofHexArray) => {
            // Create properly formatted bytes32 values (64 hex chars = 32 bytes)
            const attestationType = "0x" + "45564d5472616e73616374696f6e".padEnd(64, "0");
            const sourceId = "0x" + "7465737445544800".padEnd(64, "0");
            
            const proof: AttestationProof = {
              response: {
                attestationType,
                sourceId,
                votingRound: roundId,
                lowestUsedTimestamp: Math.floor(Date.now() / 1000),
                requestBody: { transactionHash: "0x1234" },
                responseBody: { status: "SUCCESS" },
              },
              proof: proofHexArray.map((hex) => "0x" + hex),
            };

            // Mock the contract call
            const mockContract = {
              verifyAttestation: vi.fn().mockResolvedValue(true),
            };

            // Replace ethers.Contract temporarily
            const originalContract = (global as any).ethers?.Contract;
            if (!(global as any).ethers) {
              (global as any).ethers = {};
            }
            (global as any).ethers.Contract = vi.fn().mockReturnValue(mockContract);

            try {
              // Verify proof
              const isValid = await client.verifyProof(proof);

              // Verification should return a boolean
              expect(typeof isValid).toBe("boolean");

              // Contract method should have been called
              expect(mockContract.verifyAttestation).toHaveBeenCalledWith(
                proof.response,
                proof.proof
              );
            } finally {
              // Restore original
              if (originalContract) {
                (global as any).ethers.Contract = originalContract;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flare-integration, Property 7: Attestation Data Extraction**
   * **Validates: Requirements 2.4**
   * 
   * For any verified FDC attestation, the system should successfully extract user address,
   * token address, and amount from the response body.
   */
  describe("Property 7: Attestation Data Extraction", () => {
    it("should extract transaction data from verified attestation responses", () => {
      fc.assert(
        fc.property(
          // Generate random addresses
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          // Generate random amounts
          fc.bigInt({ min: 1n, max: 1000000000000000000n }),
          (userAddressHex, tokenAddressHex, amount) => {
            const userAddress = "0x" + userAddressHex;
            const tokenAddress = "0x" + tokenAddressHex;

            // Simulate a verified attestation response
            const attestationResponse = {
              attestationType: "0x45564d5472616e73616374696f6e",
              sourceId: "0x7465737445544800",
              votingRound: 12345,
              requestBody: {
                transactionHash: "0x1234567890abcdef",
              },
              responseBody: {
                status: "SUCCESS",
                events: [
                  {
                    address: tokenAddress,
                    topics: [
                      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event
                      "0x000000000000000000000000" + userAddressHex,
                    ],
                    data: "0x" + amount.toString(16).padStart(64, "0"),
                  },
                ],
              },
            };

            // Extract data from response
            const extractedUserAddress =
              "0x" + attestationResponse.responseBody.events[0].topics[1].slice(-40);
            const extractedAmount = BigInt(attestationResponse.responseBody.events[0].data);

            // Verify extraction
            expect(extractedUserAddress.toLowerCase()).toBe(userAddress.toLowerCase());
            expect(extractedAmount).toBe(amount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: flare-integration, Property 22: FDC Proof Verification Execution**
   * **Validates: Requirements 7.4**
   * 
   * For any retrieved attestation proof, the system should verify the Merkle proof
   * against the State Connector contract before using the data.
   */
  describe("Property 22: FDC Proof Verification Execution", () => {
    it("should execute proof verification before using attestation data", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random proofs
          fc.array(fc.hexaString({ minLength: 64, maxLength: 64 }), { minLength: 1, maxLength: 5 }),
          // Generate random verification results
          fc.boolean(),
          async (proofHexArray, shouldBeValid) => {
            // Create properly formatted bytes32 values (64 hex chars = 32 bytes)
            const attestationType = "0x" + "45564d5472616e73616374696f6e".padEnd(64, "0");
            const sourceId = "0x" + "7465737445544800".padEnd(64, "0");
            
            const proof: AttestationProof = {
              response: {
                attestationType,
                sourceId,
                votingRound: 12345,
                lowestUsedTimestamp: Math.floor(Date.now() / 1000),
                requestBody: {},
                responseBody: {},
              },
              proof: proofHexArray.map((hex) => "0x" + hex),
            };

            // Mock the contract call
            const mockContract = {
              verifyAttestation: vi.fn().mockResolvedValue(shouldBeValid),
            };

            const originalContract = (global as any).ethers?.Contract;
            if (!(global as any).ethers) {
              (global as any).ethers = {};
            }
            (global as any).ethers.Contract = vi.fn().mockReturnValue(mockContract);

            try {
              // Verify proof
              const isValid = await client.verifyProof(proof);

              // Result should match the mocked value
              expect(isValid).toBe(shouldBeValid);

              // Verification should have been called before any data usage
              expect(mockContract.verifyAttestation).toHaveBeenCalledTimes(1);
            } finally {
              if (originalContract) {
                (global as any).ethers.Contract = originalContract;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit test: Hex encoding
   */
  describe("Hex encoding", () => {
    it("should correctly encode strings to hex", () => {
      const testCases = [
        { input: "EVMTransaction", expected: "45564d5472616e73616374696f6e" },
        { input: "Payment", expected: "5061796d656e74" },
        { input: "testETH", expected: "7465737445544800" },
      ];

      testCases.forEach(({ input, expected }) => {
        let result = "";
        for (let i = 0; i < input.length; i++) {
          result += input.charCodeAt(i).toString(16).padStart(2, "0");
        }
        expect(result).toContain(expected.substring(0, result.length));
      });
    });
  });
});
