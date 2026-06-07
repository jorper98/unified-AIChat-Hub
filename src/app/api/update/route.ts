import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Note: We no longer block if UPDATE_ZIP_URL is missing, as the update script 
    // will automatically fall back to fetching the latest release from the GitHub API.

    const scriptPath = path.join(process.cwd(), 'scripts', 'update-app.js');
    
    return new Promise((resolve) => {
      const child = exec(`node "${scriptPath}"`, {
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
        console.log('[Update API]', data.toString().trim());
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        console.error('[Update API Error]', data.toString().trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Update script executed successfully. Please restart the container to apply changes.',
            logs: output 
          }));
        } else {
          resolve(NextResponse.json(
            { error: 'Update script failed.', details: errorOutput || output },
            { status: 500 }
          ));
        }
      });
    });
  } catch (error: any) {
    console.error('[Update API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error during update.', details: error.message },
      { status: 500 }
    );
  }
}
