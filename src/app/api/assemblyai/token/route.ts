import { NextResponse } from 'next/server';

const ASSEMBLYAI_API_URL = 'https://agents.assemblyai.com/v1/token';

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    console.error('[Token] ASSEMBLYAI_API_KEY is not set');
    return NextResponse.json(
      {
        error: 'ASSEMBLYAI_API_KEY is not configured on the server.',
      },
      { status: 503 }
    );
  }

  try {
    const url = new URL(ASSEMBLYAI_API_URL);
    url.searchParams.set('expires_in_seconds', '300');

    console.log('[Token] Requesting temporary token from AssemblyAI...');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    console.log('[Token] AssemblyAI response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Token] AssemblyAI error:', response.status, errorBody);
      return NextResponse.json(
        {
          error: `Failed to generate voice token: ${response.status} - ${errorBody}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log('[Token] Token received:', !!data.token, 'expires_in:', data.expires_in_seconds);

    return NextResponse.json({
      token: data.token,
      expires_in_seconds: data.expires_in_seconds,
    });
  } catch (error) {
    console.error('[Token] Request failed:', error);
    return NextResponse.json(
      {
        error: `Failed to connect to AssemblyAI token service: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 502 }
    );
  }
}
