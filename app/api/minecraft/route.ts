/**
 * Minecraft Builder API
 *
 * POST - Send a chat message describing what to build.
 *        Uses the agent API to interpret the request and generate
 *        GDMC-HTTP commands, then executes them in Minecraft.
 *
 * GET  - Check Minecraft connection status.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithTokenExchange } from "@/lib/auth-middleware";
import {
  placeBlocks,
  runCommands,
  readBlocks,
  checkConnection,
} from "@/lib/minecraft-client";

const AGENT_API_URL =
  process.env.AGENT_API_URL ||
  process.env.NEXT_PUBLIC_AGENT_API_URL ||
  "http://localhost:8000";

const SYSTEM_PROMPT = `You are a Minecraft building assistant. When the user asks you to build something, you respond with a JSON object containing the build instructions.

You MUST respond with valid JSON matching this schema:
{
  "description": "Brief description of what you're building",
  "blocks": [
    { "id": "minecraft:stone", "x": 0, "y": 0, "z": 0 },
    { "id": "minecraft:oak_planks", "x": 1, "y": 0, "z": 0, "state": { "optional": "block_state" } }
  ],
  "commands": ["optional minecraft commands without slashes"],
  "origin": { "x": 0, "y": -60, "z": 0 },
  "message": "Friendly message to the user about what was built"
}

Rules:
- Use absolute coordinates. Default origin is the player's current position (provided in context).
- Block IDs must be valid Minecraft block IDs with the minecraft: prefix.
- Build relative to the provided origin coordinates.
- For large structures, use efficient patterns (loops described as repeated blocks).
- Include block states when relevant (e.g., stair facing, slab type, log axis).
- Keep builds reasonable in size (under 5000 blocks per request).
- The "commands" array is optional - use it for things like setting time, weather, or teleporting.
- Always include a friendly "message" describing what you built.
- If the user asks something that isn't about building, respond with just a "message" field and empty blocks array.
- Common block types: stone, cobblestone, oak_planks, oak_log, glass, brick, iron_block, gold_block, diamond_block, emerald_block, stone_bricks, quartz_block, smooth_stone, oak_stairs, cobblestone_stairs, oak_door, oak_fence, torch, lantern, glowstone, sea_lantern, water, lava, grass_block, dirt, sand, gravel, wool (white_wool, red_wool, etc.)`;

export async function GET() {
  const status = await checkConnection();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthWithTokenExchange(request, "agent-api");
  if (auth instanceof NextResponse) return auth;

  const { message, playerPosition } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // Check Minecraft connection first
  const connectionStatus = await checkConnection();
  if (!connectionStatus.connected) {
    return NextResponse.json(
      {
        error: "Minecraft not connected",
        message:
          "Cannot connect to Minecraft. Make sure the game is running with the GDMC-HTTP mod installed and a world is loaded.",
        details: connectionStatus.error,
      },
      { status: 503 }
    );
  }

  // Get player position context
  const origin = playerPosition || { x: 0, y: -60, z: 0 };

  // Read surrounding blocks for context
  let surroundingContext = "";
  try {
    const nearby = await readBlocks(origin.x, origin.y, origin.z, {
      dx: 5,
      dy: 3,
      dz: 5,
      includeState: false,
    });
    const groundBlocks = nearby
      .filter((b) => b.id !== "minecraft:air")
      .slice(0, 20);
    if (groundBlocks.length > 0) {
      surroundingContext = `\nNearby blocks: ${groundBlocks.map((b) => `${b.id} at (${b.x},${b.y},${b.z})`).join(", ")}`;
    }
  } catch {
    // Ignore errors reading context
  }

  const userPrompt = `Player position: x=${origin.x}, y=${origin.y}, z=${origin.z}${surroundingContext}

User request: ${message}

Respond with the JSON build instructions.`;

  try {
    // Call agent API for structured output
    const agentResponse = await fetch(`${AGENT_API_URL}/runs/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_name: "record-extractor",
        input: {
          prompt: userPrompt,
          system_prompt: SYSTEM_PROMPT,
        },
        response_schema: {
          name: "minecraft_build",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["description", "blocks", "message"],
            properties: {
              description: { type: "string" },
              blocks: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "x", "y", "z"],
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    z: { type: "number" },
                    state: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                  },
                },
              },
              commands: {
                type: "array",
                items: { type: "string" },
              },
              origin: {
                type: "object",
                additionalProperties: false,
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  z: { type: "number" },
                },
              },
              message: { type: "string" },
            },
          },
        },
        agent_tier: "complex",
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      throw new Error(`Agent API error: ${agentResponse.status} ${errorText}`);
    }

    const { output, error: agentError } = await agentResponse.json();

    if (agentError) {
      throw new Error(`Agent error: ${agentError}`);
    }

    const buildPlan =
      typeof output === "string" ? JSON.parse(output) : output;

    // Execute commands if any
    const commandResults: Array<{ command: string; result: unknown }> = [];
    if (buildPlan.commands?.length > 0) {
      const results = await runCommands(buildPlan.commands);
      buildPlan.commands.forEach((cmd: string, i: number) => {
        commandResults.push({ command: cmd, result: results[i] });
      });
    }

    // Place blocks if any
    let placementResults: unknown[] = [];
    if (buildPlan.blocks?.length > 0) {
      placementResults = await placeBlocks(buildPlan.blocks, {
        doBlockUpdates: false,
      });
    }

    const successCount = (
      placementResults as Array<{ status: number }>
    ).filter((r) => r.status === 1).length;

    return NextResponse.json({
      success: true,
      message: buildPlan.message,
      description: buildPlan.description,
      stats: {
        blocksPlaced: successCount,
        blocksTotal: buildPlan.blocks?.length || 0,
        commandsRun: commandResults.length,
      },
      commandResults,
    });
  } catch (err) {
    console.error("[MINECRAFT] Build error:", err);
    return NextResponse.json(
      {
        error: "Build failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
