import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "ash",
      }),
    });

    const responseText = await r.text();
    console.log('OpenAI raw response:', responseText); // Debug log

    if (!r.ok) {
      console.error('OpenAI API error:', responseText);
      return NextResponse.json(
        { error: `OpenAI API error: ${responseText}` },
        { status: r.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      return NextResponse.json(
        { error: 'Invalid JSON response from OpenAI' },
        { status: 500 }
      );
    }

    if (!data?.client_secret?.value) {
      console.error('Invalid response structure:', data);
      return NextResponse.json(
        { error: 'Invalid response structure from OpenAI' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Token route error:', error);
    const e = error as Error;
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 