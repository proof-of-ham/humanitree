"use server"

import type { VerificationLevel } from "@worldcoin/idkit"
import { verifyCloudProof } from "@worldcoin/idkit-core/backend"

export type VerifyReply = {
  success: boolean
  code?: string
  attribute?: string | null
  detail?: string
}

interface IVerifyRequest {
  proof: {
    nullifier_hash: string
    merkle_root: string
    proof: string
    verification_level: VerificationLevel
  }
  signal?: string
}

const app_id = process.env.WLD_APP_ID as `app_${string}`
const action = process.env.WLD_ACTION || "plant-tree"

export async function verify(proof: IVerifyRequest["proof"], signal?: string): Promise<VerifyReply> {
  try {
    const verifyRes = await verifyCloudProof(proof, app_id, action, signal)

    if (verifyRes.success) {
      // Log successful verification
      console.log("✅ World ID verification successful for tree planting")
      return { success: true }
    } else {
      console.error("❌ World ID verification failed:", verifyRes)
      return {
        success: false,
        code: verifyRes.code,
        attribute: verifyRes.attribute,
        detail: verifyRes.detail,
      }
    }
  } catch (error) {
    console.error("Verification error:", error)
    return {
      success: false,
      detail: "Verification failed due to server error",
    }
  }
}
