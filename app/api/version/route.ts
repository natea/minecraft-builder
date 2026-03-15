import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface VersionInfo {
  type: string;
  branch: string;
  commit: string;
  deployed_at: string;
  deployed_by: string;
}

/**
 * GET /api/version
 *
 * Returns deployment version information from .deployed-version file.
 * Falls back to development info when the file doesn't exist.
 */
export async function GET(request: NextRequest) {
  try {
    const versionFilePath = join(process.cwd(), '.deployed-version');
    
    try {
      const versionContent = await readFile(versionFilePath, 'utf-8');
      const versionInfo: VersionInfo = JSON.parse(versionContent);
      
      return NextResponse.json({
        success: true,
        data: {
          ...versionInfo,
          shortCommit: versionInfo.commit ? versionInfo.commit.substring(0, 7) : 'unknown',
        },
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          type: 'development',
          branch: 'local',
          commit: 'development',
          shortCommit: 'dev',
          deployed_at: null,
          deployed_by: 'local',
        },
      });
    }
  } catch (error: any) {
    console.error('[API] Version error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get version info',
    }, { status: 500 });
  }
}
