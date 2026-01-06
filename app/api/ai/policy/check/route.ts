/**
 * Policy Sentinel AI - Policy Compliance Checker
 * POST /api/ai/policy/check
 *
 * Checks proposed copy/features/workflows against Carsera's non-negotiable rules.
 * Admin-only access.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  PolicySentinelInputSchema,
  PolicySentinelOutputSchema,
} from "@/lib/ai/schemas";
import { getSystemPrompt } from "@/lib/ai/openai-client";
import { logAICall } from "@/lib/ai/audit";
import { llmJson } from "@/src/lib/llm/client";
import type { PolicySentinelOutput } from "@/lib/ai/schemas";
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

    // Only admins can use policy sentinel
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
    const validatedInput = PolicySentinelInputSchema.parse(body);

    // Call AI agent
    const systemPrompt = getSystemPrompt("policy_sentinel_ai");
    const userPrompt = JSON.stringify(validatedInput, null, 2);

    let aiOutput: PolicySentinelOutput;
    let aiRunId = "";
    let errorMessage: string | undefined;

    try {
      // Call LLM with model-agnostic client
      const rawOutput = await llmJson<PolicySentinelOutput>({
        system: systemPrompt,
        user: userPrompt,
      });

      // Validate output with Zod
      aiOutput = PolicySentinelOutputSchema.parse(rawOutput);

      // Log to database
      aiRunId = await logAICall({
        agentName: "policy_sentinel_ai",
        inputJson: validatedInput,
        outputJson: aiOutput,
        createdBy: profile.id,
        status: "success",
      });
    } catch (error: any) {
      errorMessage = error.message || "AI call failed";
      console.error("Policy Sentinel AI error:", error);

      // Check if it's an LLMError with invalid JSON (rawResponse)
      const isLLMError = error.rawResponse !== undefined;
      const isInvalidJSON =
        isLLMError && error.message?.includes("Invalid JSON");

      // Log failure
      await logAICall({
        agentName: "policy_sentinel_ai",
        inputJson: validatedInput,
        outputJson: {},
        createdBy: profile.id,
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
        { error: "AI policy check failed", details: errorMessage },
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

    console.error("Policy check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
