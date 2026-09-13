'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SYSTEM_PROMPT, getAssemblyAITools, VOICE_AGENT_CONFIG } from '@/lib/voice/agent-config';
import { ApprovalPanel } from './ApprovalPanel';

export type VoiceState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'ERROR'
  | 'DISCONNECTED';

export interface ToolActivity {
  id: string;
  toolName: string;
  status: 'started' | 'completed' | 'failed' | 'waiting_approval';
  summary: string;
  timestamp: Date;
}

export interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface PendingApproval {
  approvalId: string;
  toolName: string;
  description: string;
  callId: string;
}

interface VoiceOperatorProps {
  onStateChange?: (state: VoiceState) => void;
  onToolActivity?: (activity: ToolActivity) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
}

const ASSEMBLYAI_WS_URL = 'wss://agents.assemblyai.com/v1/ws';

export function VoiceOperator({
  onStateChange,
  onToolActivity,
  onTranscript,
}: VoiceOperatorProps) {
  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const readyRef = useRef(false);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const ASSEMBLYAI_SAMPLE_RATE = 24000;

  const updateState = useCallback(
    (newState: VoiceState) => {
      setState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  const addToolActivity = useCallback(
    (activity: ToolActivity) => {
      setToolActivities((prev) => [activity, ...prev].slice(0, 10));
      onToolActivity?.(activity);
    },
    [onToolActivity]
  );

  const addTranscript = useCallback(
    (entry: TranscriptEntry) => {
      setTranscript((prev) => [...prev, entry].slice(-20));
      onTranscript?.(entry);
    },
    [onTranscript]
  );

  const cleanup = useCallback(() => {
    readyRef.current = false;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    sourceRef.current?.disconnect();
    audioWorkletNodeRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => {});
    outputContextRef.current?.close().catch(() => {});
    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    scheduledSourcesRef.current.clear();
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    audioWorkletNodeRef.current = null;
    outputContextRef.current = null;
    sourceRef.current = null;
    playbackTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback((base64Audio: string) => {
    const raw = atob(base64Audio);
    const pcm16 = new Int16Array(raw.length / 2);
    for (let i = 0; i < pcm16.length; i++) {
      pcm16[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
    }
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    if (!outputContextRef.current) {
      outputContextRef.current = new AudioContext({ sampleRate: ASSEMBLYAI_SAMPLE_RATE });
    }
    const ctx = outputContextRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, ASSEMBLYAI_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    scheduledSourcesRef.current.add(source);
    source.onended = () => {
      scheduledSourcesRef.current.delete(source);
    };

    const now = ctx.currentTime;
    if (playbackTimeRef.current < now) {
      playbackTimeRef.current = now;
    }

    source.start(playbackTimeRef.current);
    playbackTimeRef.current += audioBuffer.duration;
  }, []);

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      console.log('[VoiceOperator] WebSocket event:', msg.type, JSON.stringify(msg).slice(0, 200));

      switch (msg.type) {
        case 'session.ready':
          readyRef.current = true;
          updateState('LISTENING');
          break;

        case 'session.updated':
          break;

        case 'session.error':
          setError(`AssemblyAI error: ${msg.code || 'unknown'} - ${msg.message || 'No message'}`);
          updateState('ERROR');
          break;

        case 'session.ended':
          readyRef.current = false;
          updateState('DISCONNECTED');
          break;

        case 'transcript.user.delta':
          if (msg.text) {
            addTranscript({
              role: 'user',
              text: msg.text,
              timestamp: new Date(),
            });
          }
          break;

        case 'transcript.agent.delta':
          if (msg.delta) {
            addTranscript({
              role: 'agent',
              text: msg.delta,
              timestamp: new Date(),
            });
          }
          break;

        case 'reply.started':
          updateState('SPEAKING');
          playbackTimeRef.current = 0;
          break;

        case 'reply.audio':
          if (msg.data) {
            playAudioChunk(msg.data);
          }
          break;

        case 'reply.done':
          if (msg.status === 'interrupted') {
            scheduledSourcesRef.current.forEach((s) => {
              try { s.stop(); } catch {}
            });
            scheduledSourcesRef.current.clear();
            playbackTimeRef.current = 0;
          }
          if (scheduledSourcesRef.current.size === 0) {
            updateState('LISTENING');
          } else {
            const checkInterval = setInterval(() => {
              if (scheduledSourcesRef.current.size === 0) {
                clearInterval(checkInterval);
                updateState('LISTENING');
              }
            }, 100);
          }
          break;

        case 'tool.call': {
          console.log('[VoiceOperator] tool.call received:', {
            call_id: msg.call_id,
            name: msg.name,
            arguments: msg.arguments,
          });

          const toolActivity: ToolActivity = {
            id: msg.call_id,
            toolName: msg.name,
            status: 'started',
            summary: `Investigating ${msg.name}...`,
            timestamp: new Date(),
          };
          addToolActivity(toolActivity);
          updateState('THINKING');

          const requestBody = {
            tool: msg.name,
            input: msg.arguments,
          };
          console.log('[VoiceOperator] POST /api/tools request:', requestBody);

          fetch('/api/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          })
            .then((response) => {
              console.log('[VoiceOperator] /api/tools response status:', response.status);
              return response.json();
            })
            .then((result) => {
              console.log('[VoiceOperator] /api/tools result:', JSON.stringify(result).slice(0, 500));

              if (result.requiresApproval) {
                const approvalActivity: ToolActivity = {
                  ...toolActivity,
                  status: 'waiting_approval',
                  summary: `${msg.name}: Waiting for approval`,
                };
                addToolActivity(approvalActivity);

                setPendingApproval({
                  approvalId: result.approvalId,
                  toolName: result.action,
                  description: result.description,
                  callId: msg.call_id,
                });

                const toolResult = {
                  type: 'tool.result',
                  call_id: msg.call_id,
                  result: JSON.stringify({
                    success: false,
                    requiresApproval: true,
                    approvalId: result.approvalId,
                    description: result.description,
                    message: result.message,
                  }),
                };
                console.log('[VoiceOperator] Sending tool.result (approval):', toolResult);
                wsRef.current?.send(JSON.stringify(toolResult));
              } else {
                const completedActivity: ToolActivity = {
                  ...toolActivity,
                  status: result.success ? 'completed' : 'failed',
                  summary: result.success
                    ? `${msg.name}: ${Array.isArray(result.data) ? result.data.length + ' results' : 'completed'}`
                    : `${msg.name}: ${result.error?.message || 'failed'}`,
                };
                addToolActivity(completedActivity);

                const toolResult = {
                  type: 'tool.result',
                  call_id: msg.call_id,
                  result: JSON.stringify(result),
                };
                console.log('[VoiceOperator] Sending tool.result:', toolResult);
                wsRef.current?.send(JSON.stringify(toolResult));
              }
            })
            .catch((err) => {
              console.error('[VoiceOperator] /api/tools fetch error:', err);
              const failedActivity: ToolActivity = {
                ...toolActivity,
                status: 'failed',
                summary: `${msg.name}: request failed`,
              };
              addToolActivity(failedActivity);

              wsRef.current?.send(
                JSON.stringify({
                  type: 'tool.result',
                  call_id: msg.call_id,
                  result: JSON.stringify({
                    success: false,
                    error: { code: 'NETWORK_ERROR', message: 'Failed to reach server.' },
                  }),
                })
              );
            });
          break;
        }

        case 'input.speech.started':
          break;

        case 'input.speech.stopped':
          break;
      }
    },
    [updateState, addToolActivity, addTranscript, playAudioChunk]
  );

  const stopVoice = useCallback(() => {
    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch {}
    });
    scheduledSourcesRef.current.clear();
    playbackTimeRef.current = 0;
    setPendingApproval(null);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'session.end' }));
    }
    setTimeout(() => {
      wsRef.current?.close();
      cleanup();
      updateState('IDLE');
    }, 500);
  }, [updateState, cleanup]);

  const handleApprovalResolved = useCallback((approvalId: string, status: string) => {
    if (pendingApproval && pendingApproval.approvalId === approvalId) {
      const completedActivity: ToolActivity = {
        id: pendingApproval.callId,
        toolName: pendingApproval.toolName,
        status: status === 'APPROVED' ? 'completed' : 'failed',
        summary: status === 'APPROVED'
          ? `${pendingApproval.toolName}: Approved and executed`
          : `${pendingApproval.toolName}: Rejected`,
        timestamp: new Date(),
      };
      addToolActivity(completedActivity);
      setPendingApproval(null);
    }
  }, [pendingApproval, addToolActivity]);

  const startVoice = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setToolActivities([]);
    readyRef.current = false;
    updateState('CONNECTING');

    try {
      const tokenResponse = await fetch('/api/assemblyai/token');
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || 'Failed to get voice token');
      }

      if (!tokenData.token) {
        throw new Error('No token received from server');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext();
      sourceRef.current = inputCtx.createMediaStreamSource(stream);

      await inputCtx.audioWorklet.addModule(
        'data:text/javascript,' +
          encodeURIComponent(
            `class PCMProcessor extends AudioWorkletProcessor {
              constructor(options) {
                super();
                const { inputSampleRate, targetSampleRate } = options.processorOptions || {};
                this.inputSampleRate = inputSampleRate || 48000;
                this.targetSampleRate = targetSampleRate || 24000;
                this.ratio = this.inputSampleRate / this.targetSampleRate;
              }
              process(inputs) {
                const input = inputs[0]?.[0];
                if (!input) return true;
                const outLength = Math.floor(input.length / this.ratio);
                const pcm16 = new Int16Array(outLength);
                for (let i = 0; i < outLength; i++) {
                  const sample = input[Math.floor(i * this.ratio)] ?? 0;
                  pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
                }
                this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
                return true;
              }
            }
            registerProcessor('pcm-processor', PCMProcessor);`
          )
      );

      audioWorkletNodeRef.current = new AudioWorkletNode(
        inputCtx,
        'pcm-processor',
        {
          processorOptions: {
            inputSampleRate: inputCtx.sampleRate,
            targetSampleRate: 24000,
          },
        }
      );

      audioWorkletNodeRef.current.port.onmessage = (event) => {
        if (readyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(event.data)));
          wsRef.current.send(
            JSON.stringify({
              type: 'input.audio',
              audio: b64,
            })
          );
        }
      };

      sourceRef.current.connect(audioWorkletNodeRef.current);
      audioContextRef.current = inputCtx;

      const wsUrl = new URL(ASSEMBLYAI_WS_URL);
      wsUrl.searchParams.set('token', tokenData.token);
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        const tools = getAssemblyAITools();
        const sessionUpdate = {
          type: 'session.update',
          session: {
            system_prompt: SYSTEM_PROMPT,
            greeting: VOICE_AGENT_CONFIG.greeting,
            output: {
              voice: VOICE_AGENT_CONFIG.voice.voice_id,
            },
            tools: tools,
          },
        };
        console.log('[VoiceOperator] Sending session.update with', tools.length, 'tools');
        console.log('[VoiceOperator] Tool names:', tools.map(t => t.name).join(', '));
        ws.send(JSON.stringify(sessionUpdate));
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = () => {
        setError('WebSocket connection error');
        updateState('ERROR');
      };

      ws.onclose = (event) => {
        if (readyRef.current) {
          updateState('DISCONNECTED');
          cleanup();
        } else if (event.code !== 1000) {
          setError(`WebSocket closed: ${event.code} ${event.reason}`);
          updateState('ERROR');
          cleanup();
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice');
      updateState('ERROR');
      cleanup();
    }
  }, [updateState, handleWebSocketMessage, cleanup]);

  useEffect(() => {
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'session.end' }));
      }
      wsRef.current?.close();
      cleanup();
    };
  }, [cleanup]);

  const stateConfig: Record<VoiceState, { label: string; color: string; icon: string }> = {
    IDLE: { label: 'Ready', color: 'text-slate-400', icon: '○' },
    CONNECTING: { label: 'Connecting...', color: 'text-yellow-400', icon: '◎' },
    LISTENING: { label: 'Listening', color: 'text-green-400', icon: '●' },
    THINKING: { label: 'Investigating...', color: 'text-blue-400', icon: '◎' },
    SPEAKING: { label: 'Speaking', color: 'text-purple-400', icon: '♫' },
    ERROR: { label: 'Error', color: 'text-red-400', icon: '✕' },
    DISCONNECTED: { label: 'Disconnected', color: 'text-slate-500', icon: '○' },
  };

  const config = stateConfig[state];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-cyan-400">🎙</span>
          Voice Operator
        </h2>
        <span className={`text-sm font-medium ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        {(state === 'IDLE' || state === 'ERROR' || state === 'DISCONNECTED') && (
          <button
            onClick={startVoice}
            className="flex-1 py-3 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
          >
            Start Voice Session
          </button>
        )}
        {(state === 'CONNECTING' ||
          state === 'LISTENING' ||
          state === 'THINKING' ||
          state === 'SPEAKING') && (
          <button
            onClick={stopVoice}
            className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            End Session
          </button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Transcript</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`text-sm ${
                  entry.role === 'user' ? 'text-slate-300' : 'text-cyan-300'
                }`}
              >
                <span className="text-xs text-slate-600">
                  {entry.role === 'user' ? 'You' : 'OPERO'}:
                </span>{' '}
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {toolActivities.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Tool Activity</h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {toolActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activity.status === 'started'
                      ? 'bg-yellow-400 animate-pulse'
                      : activity.status === 'waiting_approval'
                      ? 'bg-amber-400 animate-pulse'
                      : activity.status === 'completed'
                      ? 'bg-green-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-slate-400">{activity.toolName}</span>
                <span className="text-slate-600 truncate">{activity.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ApprovalPanel onApprovalResolved={handleApprovalResolved} />
    </div>
  );
}
