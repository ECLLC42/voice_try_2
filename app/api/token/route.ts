import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "nova",
      }),
    });

    if (!r.ok) {
      const error = await r.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${error}` },
        { status: r.status }
      );
    }

    const data = await r.json();
    
    if (!data?.client_secret?.value) {
      return NextResponse.json(
        { error: 'Invalid response from OpenAI API' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Token route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 