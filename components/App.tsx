'use client'

import { useEffect, useRef, useState } from "react";
import Image from 'next/image';
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";

interface Event {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  async function startSession() {
    try {
      setIsLoading(true);
      // Get an ephemeral key from the Next.js API route
      const tokenResponse = await fetch("/api/token");
      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || 'Failed to get token');
      }
      
      const data = await tokenResponse.json();
      
      if (!data?.client_secret?.value) {
        throw new Error('Invalid token response');
      }
      
      const EPHEMERAL_KEY = data.client_secret.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
    } catch (error) {
      console.error('Failed to start session:', error);
      const e = error as Error;
      alert(e.message || 'Failed to start session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  function sendClientEvent(message: Event) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  function sendTextMessage(message: string) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });

      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <Image 
            width={24} 
            height={24} 
            src="/openai-logomark.svg" 
            alt="OpenAI Logo"
          />
          <h1>realtime console</h1>
        </div>
      </nav>
      
      <section className="absolute top-16 left-0 right-[380px] bottom-0 flex">
        <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <div key={event.event_id} className="p-2 bg-white rounded shadow">
                <pre className="text-xs">{JSON.stringify(event, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>
        
        <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
          <div className="flex items-center gap-4 h-full">
            {!isSessionActive ? (
              <button
                onClick={startSession}
                disabled={isLoading}
                className={`${isLoading ? 'bg-gray-400' : 'bg-red-600'} text-white rounded-full p-4 flex items-center gap-2`}
              >
                <CloudLightning size={16} />
                <span>{isLoading ? 'connecting...' : 'start session'}</span>
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="send a text message..."
                  className="flex-1 p-4 rounded-full border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      if (input.value.trim()) {
                        sendTextMessage(input.value);
                        input.value = "";
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input');
                    if (input && input.value.trim()) {
                      sendTextMessage(input.value);
                      input.value = "";
                    }
                  }}
                  className="bg-blue-400 text-white rounded-full p-4 flex items-center gap-2"
                >
                  <MessageSquare size={16} />
                  <span>send text</span>
                </button>
                <button
                  onClick={stopSession}
                  className="bg-gray-800 text-white rounded-full p-4 flex items-center gap-2"
                >
                  <CloudOff size={16} />
                  <span>disconnect</span>
                </button>
              </>
            )}
          </div>
        </section>
      </section>
      
      <section className="absolute top-16 w-[380px] right-0 bottom-0 p-4 bg-gray-50">
        <h2 className="text-lg font-bold mb-4">Tools Panel</h2>
        {/* Add your tools panel content here */}
      </section>
    </main>
  );
} 