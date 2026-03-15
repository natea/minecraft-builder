"use client";

import { Blocks } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Build History
      </h1>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Blocks className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Build history will appear here once you start building structures.
        </p>
      </div>
    </div>
  );
}
