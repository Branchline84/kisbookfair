import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const binaryString = window.atob(pcmBase64);
  const pcmLength = binaryString.length;
  
  const buffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(buffer);
  
  // RIFF chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);
  
  // Write PCM data
  const uint8View = new Uint8Array(buffer);
  for (let i = 0; i < pcmLength; i++) {
    uint8View[44 + i] = binaryString.charCodeAt(i);
  }
  
  // Convert to base64
  let wavBinaryString = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8View.length; i += chunkSize) {
    wavBinaryString += String.fromCharCode.apply(null, Array.from(uint8View.subarray(i, i + chunkSize)));
  }
  return window.btoa(wavBinaryString);
}

const greetingAudioCache: Record<string, Promise<string | null>> = {};

export async function prefetchGreetingAudio(characterName: string, personality: string) {
  if (greetingAudioCache[characterName]) return;
  const greeting = `안녕? 나는 ${characterName}야. 만나서 반가워~ 넌 이름이 뭐야?`;
  console.log(`Prefetching greeting audio for ${characterName}`);
  
  // Create a promise with a timeout
  const generatePromise = generateAudio(characterName, greeting);
  const timeoutPromise = new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error("Prefetch Timeout")), 15000)
  );

  greetingAudioCache[characterName] = Promise.race([generatePromise, timeoutPromise])
    .catch((e) => {
      console.warn(`Prefetch failed for ${characterName}:`, e.message);
      delete greetingAudioCache[characterName];
      return null;
    });
}

export async function getCachedGreetingAudio(characterName: string): Promise<string | null> {
  if (greetingAudioCache[characterName]) {
    try {
      // Add a small timeout even for cached results to be safe
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error("Cache Wait Timeout")), 5000)
      );
      return await Promise.race([greetingAudioCache[characterName], timeoutPromise]);
    } catch (e) {
      console.warn(`Cache retrieval failed for ${characterName}:`, e);
      return null;
    }
  }
  return null;
}

export async function generateGreetingText(characterName: string, characterPersonality: string, userName: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterName,
        characterPersonality,
        history: [],
        userMessage: `어린이가 자신의 이름을 '${userName}'라고 대답했어. 이 대답에서 어린이의 진짜 이름을 파악해서 불러줘.
다음 내용을 포함해서 아주 밝고 활기차고 신나는 목소리로, 친근하고 재미있게 2~3문장으로 짧게 말해줘:
1. 파악한 어린이의 이름을 반갑게 부르며 인사하기
2. '소공인'은 우리 생활에 필요한 물건을 직접 만드는 멋진 장인이라고 아주 짧게 설명하기
3. '나랑 같이 사진 찍을래? 아니면 칠보공예 체험이나 티셔츠 만들기를 할래?' 라고 물어보기`
      })
    });
    const result = await response.json();
    return result.text || "안녕? 만나서 반가워~";
  } catch (error) {
    console.error("OpenAI Chat Proxy Error", error);
    return `안녕? ${userName}~ 어린이 책잔치에 온 걸 환영해! 나는 ${characterName}야. 소공인은 우리 생활에 필요한 멋진 물건을 직접 만드는 장인들이란다. 나랑 같이 사진 찍을래? 아니면 칠보공예 체험이나 티셔츠 만들기를 할래?`;
  }
}

export async function generateChatResponse(characterName: string, characterPersonality: string, history: {role: string, text: string}[], userMessage: string): Promise<{text: string, detectedActivity: 'photo' | 'craft' | 'tshirt' | 'none'}> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterName,
        characterPersonality,
        history,
        userMessage
      })
    });
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("OpenAI Chat Proxy Error", error);
    return { text: "미안해, 지금은 귀가 잘 안 들려. 다시 말해줄래?", detectedActivity: "none" };
  }
}

const audioCache = new Map<string, string>();

async function generateTTSProxy(characterName: string, text: string): Promise<string | null> {
  console.log(`Calling Edge TTS Proxy for ${characterName}: "${text.substring(0, 20)}..."`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName, text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Edge TTS Proxy returned error:", response.status, errorData);
      return null;
    }

    const data = await response.json();
    if (data.audioContent) {
      return `data:audio/mp3;base64,${data.audioContent}`;
    }
    return null;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("Edge TTS Proxy Timeout (10s)");
    } else {
      console.error("Edge TTS Proxy Fetch Error", error);
    }
    return null;
  }
}

export async function generateAudio(characterName: string, text: string): Promise<string | null> {
  const cacheKey = `${characterName}|${text}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey) || null;
  }

  // 1. Try Edge TTS first for FASTER response (Lower Latency)
  // The user complained about thinking time, and Edge TTS is generally more responsive than Gemini TTS Preview
  const proxyAudio = await generateTTSProxy(characterName, text);
  if (proxyAudio) {
    audioCache.set(cacheKey, proxyAudio);
    return proxyAudio;
  }

  // 2. Fallback to Gemini TTS if Edge TTS fails
  try {
    console.log(`Generating Gemini TTS fallback for ${characterName}: "${text.substring(0, 20)}..."`);
    
    // Map characters to Gemini voices
    let voiceName = 'Kore'; 
    let promptPrefix = "Say cheerfully: ";

    if (characterName === '호백') {
      voiceName = 'Fenrir';
      promptPrefix = "Say in a deep, friendly voice: ";
    } else if (characterName === '갓도령') {
      voiceName = 'Puck';
      promptPrefix = "Say in a clear, confident, and youthful boy's voice: ";
    } else if (characterName === '아라') {
      voiceName = 'Kore';
      promptPrefix = "Say very cheerfully and brightly: ";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${promptPrefix}${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const wavAudio = `data:audio/wav;base64,${pcmToWavBase64(base64Audio, 24000)}`;
      audioCache.set(cacheKey, wavAudio);
      return wavAudio;
    }
  } catch (error: any) {
    console.error("Gemini TTS Fallback Error:", error);
  }
  
  return null;
}
