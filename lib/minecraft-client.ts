/**
 * GDMC HTTP Interface Client
 *
 * Communicates with a Minecraft instance running the GDMC-HTTP mod.
 * Default endpoint: http://localhost:9000
 *
 * @see https://github.com/Niels-NTG/gdmc_http_interface
 */

const MINECRAFT_URL = process.env.MINECRAFT_HTTP_URL || "http://localhost:9000";

export interface Block {
  id: string;
  x: number;
  y: number | string;
  z: number;
  state?: Record<string, string>;
  data?: string;
}

export interface BlockPlacement {
  id: string;
  x: number;
  y: number | string;
  z: number;
  state?: Record<string, string>;
  data?: string;
}

export interface CommandResult {
  status: number;
  message?: string;
  data?: Record<string, unknown>;
}

export interface PlacementResult {
  status: number;
  message?: string;
}

/**
 * Place blocks in the Minecraft world.
 */
export async function placeBlocks(
  blocks: BlockPlacement[],
  options?: {
    x?: number;
    y?: number;
    z?: number;
    doBlockUpdates?: boolean;
    dimension?: string;
  }
): Promise<PlacementResult[]> {
  const params = new URLSearchParams();
  if (options?.x !== undefined) params.set("x", String(options.x));
  if (options?.y !== undefined) params.set("y", String(options.y));
  if (options?.z !== undefined) params.set("z", String(options.z));
  if (options?.doBlockUpdates === false) params.set("doBlockUpdates", "false");
  if (options?.dimension) params.set("dimension", options.dimension);

  const url = `${MINECRAFT_URL}/blocks?${params}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(blocks),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to place blocks: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Read blocks from the Minecraft world.
 */
export async function readBlocks(
  x: number,
  y: number,
  z: number,
  options?: {
    dx?: number;
    dy?: number;
    dz?: number;
    includeState?: boolean;
    dimension?: string;
  }
): Promise<Block[]> {
  const params = new URLSearchParams({
    x: String(x),
    y: String(y),
    z: String(z),
  });
  if (options?.dx !== undefined) params.set("dx", String(options.dx));
  if (options?.dy !== undefined) params.set("dy", String(options.dy));
  if (options?.dz !== undefined) params.set("dz", String(options.dz));
  if (options?.includeState) params.set("includeState", "true");
  if (options?.dimension) params.set("dimension", options.dimension);

  const url = `${MINECRAFT_URL}/blocks?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to read blocks: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Run Minecraft commands.
 */
export async function runCommands(
  commands: string[],
  options?: { x?: number; y?: number; z?: number; dimension?: string }
): Promise<CommandResult[]> {
  const params = new URLSearchParams();
  if (options?.x !== undefined) params.set("x", String(options.x));
  if (options?.y !== undefined) params.set("y", String(options.y));
  if (options?.z !== undefined) params.set("z", String(options.z));
  if (options?.dimension) params.set("dimension", options.dimension);

  const url = `${MINECRAFT_URL}/commands?${params}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=UTF-8" },
    body: commands.join("\n"),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run commands: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get the current build area.
 */
export async function getBuildArea(): Promise<{
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
} | null> {
  try {
    const response = await fetch(`${MINECRAFT_URL}/buildarea`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Check if the GDMC HTTP server is reachable.
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${MINECRAFT_URL}/blocks?x=0&y=64&z=0`, {
      signal: AbortSignal.timeout(3000),
    });
    return { connected: response.ok };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
