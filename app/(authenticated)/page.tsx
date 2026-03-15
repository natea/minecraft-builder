"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@jazzmind/busibox-app/components/auth/SessionProvider";
import {
  Send,
  Blocks,
  Wifi,
  WifiOff,
  Loader2,
  MapPin,
  ChevronDown,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  stats?: {
    blocksPlaced: number;
    blocksTotal: number;
    commandsRun: number;
  };
  error?: boolean;
  timestamp: Date;
}

export default function BuilderPage() {
  const { isAuthenticated } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: -60, z: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${basePath}/api/minecraft`, {
        credentials: "include",
      });
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${basePath}/api/minecraft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          playerPosition: playerPos,
        }),
        credentials: "include",
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || data.error || "Build complete!",
        stats: data.stats,
        error: !res.ok,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          err instanceof Error ? err.message : "Failed to communicate with the server.",
        error: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">
          Please log in to use the Minecraft Builder.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Blocks className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Minecraft Builder
          </h1>
          <div className="flex items-center gap-1.5">
            {connected === null ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-xs ${
                connected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {connected === null
                ? "Checking..."
                : connected
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <MapPin className="h-4 w-4" />
          <span>
            {playerPos.x}, {playerPos.y}, {playerPos.z}
          </span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Build Origin:
            </span>
            <div className="flex items-center gap-2">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis} className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 uppercase">
                    {axis}
                  </span>
                  <input
                    type="number"
                    value={playerPos[axis]}
                    onChange={(e) =>
                      setPlayerPos((prev) => ({
                        ...prev,
                        [axis]: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={checkConnection}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh connection
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Blocks className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
              What would you like to build?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Describe a structure and I&apos;ll build it in your Minecraft
              world. Make sure you have the GDMC-HTTP mod installed and a
              world loaded.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Build a small stone house",
                "Create a 10-block tall tower",
                "Build a wooden bridge 20 blocks long",
                "Make a fountain with water",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.error
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.stats && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex gap-4 text-xs opacity-75">
                    <span>
                      {msg.stats.blocksPlaced}/{msg.stats.blocksTotal} blocks placed
                    </span>
                    {msg.stats.commandsRun > 0 && (
                      <span>{msg.stats.commandsRun} commands run</span>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`text-xs mt-1 ${
                  msg.role === "user" ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">
                Building...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connected
                ? "Describe what to build..."
                : "Waiting for Minecraft connection..."
            }
            disabled={loading || !connected}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !connected}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
