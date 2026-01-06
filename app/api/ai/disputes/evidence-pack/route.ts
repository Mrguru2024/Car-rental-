/**
 * EvidencePack AI - Dispute Evidence Organization
 * POST /api/ai/disputes/evidence-pack
 *
 * Structures dispute evidence into a timeline and summary.
 * Does NOT decide fault or liability.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  EvidencePackInputSchema,
  EvidencePackOutputSchema,
} from "@/lib/ai/schemas";
import { getSystemPrompt } from "@/lib/ai/openai-client";
import { logAICall } from "@/lib/ai/audit";
import { llmJson } from "@/src/lib/llm/client";
import type { EvidencePackOutput } from "@/lib/ai/schemas";
import type { LLMError } from "@/src/lib/llm/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can request evidence packs
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (
      !profile ||
      !["admin", "prime_admin", "super_admin"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedInput = EvidencePackInputSchema.parse(body);

    // Call AI agent
    const systemPrompt = getSystemPrompt("evidencepack_ai");
    const userPrompt = JSON.stringify(validatedInput, null, 2);

    let aiOutput: EvidencePackOutput;
    let aiRunId = "";
    let errorMessage: string | undefined;

    try {
      // Call LLM with model-agnostic client
      const rawOutput = await llmJson<EvidencePackOutput>({
        system: systemPrompt,
        user: userPrompt,
      });

      // Validate output with Zod
      aiOutput = EvidencePackOutputSchema.parse(rawOutput);

      // Log to database
      aiRunId = await logAICall({
        agentName: "evidencepack_ai",
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        status: "success",
      });
    } catch (error: any) {
      errorMessage = error.message || "AI call failed";
      console.error("EvidencePack AI error:", error);

      // Check if it's an LLMError with invalid JSON (rawResponse)
      const isLLMError = error.rawResponse !== undefined;
      const isInvalidJSON =
        isLLMError && error.message?.includes("Invalid JSON");

      // Log failure
      await logAICall({
        agentName: "evidencepack_ai",
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
        bookingId: validatedInput.booking_id,
        status: "failed",
        errorMessage,
      });

      // Return 502 with raw response if JSON is invalid
      if (isInvalidJSON) {
        const llmError = error as LLMError;
        return NextResponse.json(
          {
            error: "Invalid JSON response from LLM provider",
            provider: llmError.provider,
            rawResponse: llmError.rawResponse,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "AI evidence pack failed", details: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...aiOutput,
      ai_run_id: aiRunId,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Evidence pack error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
