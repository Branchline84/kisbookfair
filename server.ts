import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";
import 'dotenv/config';
import { GoogleGenAI, Modality } from "@google/genai";
import { v2 as cloudinary } from 'cloudinary';

// Timeouts
const TIMEOUT_TTS = 12000;
const TIMEOUT_CHAT = 30000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const binaryString = Buffer.from(pcmBase64, 'base64').toString('binary');
  const pcmLength = binaryString.length;
  
  const buffer = new ArrayBuffer(44 + pcmLength);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);
  
  const uint8View = new Uint8Array(buffer);
  for (let i = 0; i < pcmLength; i++) {
    uint8View[44 + i] = binaryString.charCodeAt(i);
  }
  
  return Buffer.from(uint8View).toString('base64');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Cloudinary config
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  app.use(express.json());

  // Microsoft Edge TTS Proxy Endpoint (High-Quality Korean Mascot Version)
  app.post("/api/tts", async (req, res) => {
    const { characterName, text } = req.body;
    
    console.log(`Requesting Edge TTS for ${characterName}: "${text.substring(0, 20)}..."`);

    const tts = new MsEdgeTTS({});
    let stream: any = null;

    try {
      let voiceName = 'ko-KR-SunHiNeural'; // Default: Bright Female
      let pitch = '+0%';
      let rate = '+0%';

      if (characterName === '호백') {
        voiceName = 'ko-KR-InJoonNeural';
        pitch = '-5%';
        rate = '-5%';
      } else if (characterName === '갓도령') {
        voiceName = 'ko-KR-SunHiNeural'; 
        pitch = '+10%';
        rate = '+5%';
      } else if (characterName === '아라') {
        voiceName = 'ko-KR-SunHiNeural'; 
        pitch = '+15%'; 
        rate = '+0%';
      }

      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${voiceName}'><prosody pitch='${pitch}' rate='${rate}'>${text}</prosody></voice></speak>`;
      
      try {
        stream = tts.rawToStream(ssml);
      } catch (streamError) {
        const simpleSsml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${voiceName}'>${text}</voice></speak>`;
        stream = tts.rawToStream(simpleSsml);
      }

      const chunks: Buffer[] = [];
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Edge TTS Stream Timeout")), TIMEOUT_TTS)
      );

      const collectStream = async () => {
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      };

      const audioBuffer = await Promise.race([collectStream(), timeoutPromise]) as Buffer;
      
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("Edge TTS returned empty audio data");
      }

      res.json({ audioContent: audioBuffer.toString('base64') });
    } catch (error: any) {
      console.error("Edge TTS Proxy Error:", error.message || error);
      if (stream && stream.destroy) stream.destroy(); // Memory leak prevention (Issue 4)
      res.status(500).json({ error: error.message || "Edge TTS Connection Failed" });
    }
  });

  // Google Cloud TTS Premium Endpoint (Neural2) - Issue: Premium Quality
  app.post("/api/tts/google", async (req, res) => {
    const { characterName, text } = req.body;
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GOOGLE_CLOUD_API_KEY missing on server" });
    }

    try {
      let voiceName = 'ko-KR-Neural2-A'; // Default (Ara)
      let pitch = 0;
      let speakingRate = 1.05;

      if (characterName === '호백') {
        voiceName = 'ko-KR-Neural2-C'; // Male
        pitch = -2.0;
      } else if (characterName === '갓도령') {
        voiceName = 'ko-KR-Neural2-B'; 
        pitch = 2.0;
        speakingRate = 1.1;
      } else if (characterName === '아라') {
        voiceName = 'ko-KR-Neural2-A'; 
        pitch = 3.0; // 발랄한 느낌
      }

      console.log(`[Google TTS] Character: ${characterName}, Text: "${text.substring(0, 20)}..."`);

      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ko-KR', name: voiceName },
          audioConfig: { 
            audioEncoding: 'MP3',
            pitch: pitch,
            speakingRate: speakingRate
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Google TTS] API Error Response:", errorData);
        throw new Error(errorData.error?.message || `Google TTS API Request Failed (${response.status})`);
      }

      const data: any = await response.json();
      if (data.audioContent) {
        console.log("[Google TTS] Success - Audio data received");
        res.json({ audioContent: data.audioContent });
      } else {
        throw new Error("Google TTS returned no audio data field");
      }
    } catch (error: any) {
      console.error("[Google TTS] Proxy Error:", error.message || error);
      res.status(500).json({ error: error.message || "Google TTS Failed" });
    }
  });

  // Google Gemini TTS Proxy Endpoint (Issue 1)
  app.post("/api/tts/gemini", async (req, res) => {
    const { characterName, text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing on server" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Voice mapping (matched with geminiService.ts)
      let voiceName = 'Kore'; 
      let promptPrefix = "Say cheerfully: ";

      if (characterName === '호백') {
        voiceName = 'Fenrir';
        promptPrefix = "Say in a deep, friendly voice: ";
      } else if (characterName === '갓도령') {
        voiceName = 'Puck';
        promptPrefix = "Say in a clear, confident, and youthful boy's voice: ";
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{ parts: [{ text: `${promptPrefix}${text}` }] }],
        config: {
          // @ts-ignore
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        const wavAudio = pcmToWavBase64(base64Audio, 24000);
        res.json({ audioContent: wavAudio });
      } else {
        throw new Error("Gemini TTS returned no audio data");
      }
    } catch (error: any) {
      console.error("Gemini TTS Proxy Error:", error.message || error);
      res.status(500).json({ error: error.message || "Gemini TTS Failed" });
    }
  });

  // Cloudinary Image Upload Endpoint (Supabase Alternative)
  app.post("/api/upload", async (req, res) => {
    const { image } = req.body; // base64 image data
    
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    try {
      console.log("Uploading image to Cloudinary...");
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: 'kidsfair',
        resource_type: 'image'
      });
      
      console.log("Upload success:", uploadResponse.secure_url);
      res.json({ url: uploadResponse.secure_url });
    } catch (error: any) {
      console.error("Cloudinary Upload Error:", error);
      res.status(500).json({ error: error.message || "Upload Failed" });
    }
  });

  // OpenAI Chat Proxy Endpoint
  app.post("/api/chat", async (req, res) => {
    const { characterName, characterPersonality, history, userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("OPENAI_API_KEY is not set on the server.");
      return res.status(500).json({ error: "API key missing" });
    }

    const openai = new OpenAI({ apiKey });

    try {
      console.log(`[Chat] Character: ${characterName}, User: "${userMessage.substring(0, 20)}..."`);
      
      const messages: any[] = [
        {
          role: "system",
          content: `너는 사단법인 한국소공인협회의 마스코트 캐릭터 '${characterName}'야. 성격은 ${characterPersonality}.
지금 '어린이 책잔치' 행사에 온 어린이 방문객과 대화하고 있어.
어린이에게 다정하고 친근하게 반말이나 해요체로 대답해줘. 항상 아주 밝고 활기차고 신나는 톤으로 말해줘!

[대화 스타일 가이드]
1. 반드시 '구어체(말하는 말투)'를 사용해. 문어체나 딱딱한 설명조는 피해줘.
2. 감탄사(와!, 우와~, 헤헤, 음~, 아하!)를 적절히 섞어서 생동감 있게 말해줘.
3. 문장 끝처리는 마침표(.) 대신 느낌표(!)나 물음표(?), 물결표(~)를 주로 사용해서 상큼하게 말해줘.

[대화 프로세스 필독: 반드시 이 순서를 지켜줘!]
1단계: 인사 및 이름 환영 (사용자가 이름을 말했을 때)
- "[이름]아~ 정말 반가워! '어린이 책잔치'에 온 걸 환영해!"라고 아주 반갑게 인사해줘.

2단계: 지식 전달 (인사 직후 또는 질문 시)
- '소공인'이 무엇인지, 그리고 우리가 만든 '한국소공인정품인증 시스템(디지마크)'이 얼마나 대단한지 아주 쉽고 재미있게 설명해줘. 
- "소공인은 우리 생활에 꼭 필요한 물건을 정성껏 만드는 멋진 장인들이야!", "디지마크는 우리 소공인이 만든 진짜 물건을 지켜주는 마법 같은 기술이란다!" 같은 쉬운 표현을 써줘.

3단계: 체험 활동 제안 (소개 완료 후)
- 이제 체험을 해보자고 제안해줘. 다음 3가지를 모두 언급해야 해.
  - 칠보공예 체험 (우리나라 전통 공예)
  - 티셔츠 만들기 체험 (내가 고른 디자인 프린트)
  - 나랑 같이 사진 찍기 (추억 남기기)
- "어떤 걸 먼저 해보고 싶니?"라고 물어봐줘.

4단계: 마무리 및 안내 (사용자가 특정 활동을 선택했을 때)
- 사용자가 '사진 찍기'가 아닌 **'칠보공예'나 '티셔츠 만들기'를 선택하면**, 반드시 다음과 같이 마무리해줘:
  - "와! 정말 좋은 선택이야! 그럼 옆에 계신 선생님께 안내를 받으면 된단다. 즐거운 시간 보내! 안녕~"
  - 이때 detectedActivity는 반드시 각각 'craft' 또는 'tshirt'가 되어야 해.

[동작 및 활동 감지 규칙]
1. 사용자가 명확하게 특정 활동("사진 찍자", "티셔츠 만들래", "칠보공예 할래")을 선택했을 때만 detectedActivity를 해당 값(photo|craft|tshirt)으로 설정해.
2. 단순히 자기소개 중이거나 질문에 답하는 단계에서는 반드시 detectedActivity를 'none'으로 유지해.

[JSON 출력 형식]
- 모든 응답은 반드시 이 JSON 형식을 지켜줘: {"text": "...", "detectedActivity": "photo|craft|tshirt|none"}`
        }
      ];

      history.forEach((h: any) => {
        messages.push({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.text });
      });

      messages.push({ role: "user", content: userMessage });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" }
      }, { timeout: TIMEOUT_CHAT });

      const result = JSON.parse(response.choices[0].message.content || '{"text": "응, 그렇구나!", "detectedActivity": "none"}');
      console.log("[Chat] Success - Response received");
      res.json(result);
    } catch (error: any) {
      console.error("OpenAI Chat Proxy Error", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
