import {
  Connection,
  PublicKey,
  Commitment,
  PublicKeyInitData,
} from "@solana/web3.js";

export function deriveEmitterSequenceKey(
  emitter: PublicKeyInitData,
  wormholeProgramId: PublicKeyInitData
): PublicKey {
  return deriveAddress(
    [Buffer.from("Sequence"), new PublicKey(emitter).toBytes()],
    wormholeProgramId
  );
}

export function deriveAddress(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKeyInitData
): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, new PublicKey(programId))[0];
}

