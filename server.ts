import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Microsoft Edge TTS Proxy Endpoint (High-Quality Korean Mascot Version)
  app.post("/api/tts", async (req, res) => {
    const { characterName, text } = req.body;
    
    console.log(`Requesting Edge TTS for ${characterName}: "${text.substring(0, 20)}..."`);

    try {
      const tts = new MsEdgeTTS({}); // Constructor requires an object
      let voiceName = 'ko-KR-SunHiNeural'; // Default: Bright Female
      let pitch = '+0%';
      let rate = '+0%';

      if (characterName === '호백') {
        voiceName = 'ko-KR-InJoonNeural'; // Male
        pitch = '-5%';
        rate = '-5%';
      } else if (characterName === '갓도령') {
        voiceName = 'ko-KR-SunHiNeural'; 
        pitch = '+10%';
        rate = '+5%';
      } else if (characterName === '아라') {
        voiceName = 'ko-KR-SunHiNeural'; 
        pitch = '+15%'; // 상큼한 하이톤
        rate = '+0%';
      }

      console.log(`Edge TTS Config: Voice=${voiceName}, Pitch=${pitch}, Rate=${rate}`);

      try {
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      } catch (metaError: any) {
        console.error("Edge TTS setMetadata failed:", metaError.message);
        throw metaError;
      }
      
      // Use SSML for better control over pitch and rate
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${voiceName}'><prosody pitch='${pitch}' rate='${rate}'>${text}</prosody></voice></speak>`;
      
      console.log(`Sending SSML to Edge TTS...`);
      
      // rawToStream returns a Readable stream
      let stream;
      try {
        stream = tts.rawToStream(ssml);
      } catch (streamError: any) {
        console.error("Edge TTS rawToStream failed:", streamError.message);
        // Try a simpler SSML as fallback
        const simpleSsml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ko-KR'><voice name='${voiceName}'>${text}</voice></speak>`;
        console.log("Retrying with simple SSML...");
        stream = tts.rawToStream(simpleSsml);
      }

      const chunks: Buffer[] = [];
      
      // Add a timeout to the stream collection to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Edge TTS Stream Timeout")), 12000)
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

      const base64Audio = audioBuffer.toString('base64');
      console.log(`Edge TTS success: ${base64Audio.length} bytes generated`);
      res.json({ audioContent: base64Audio });
    } catch (error: any) {
      console.error("Edge TTS Proxy Error:", error.message || error);
      res.status(500).json({ error: error.message || "Edge TTS Connection Failed" });
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

[대화 프로세스 필독: 중요!]
사용자가 처음 이름을 말했을 때(대화의 시작 단계) 반드시 다음 순서로 대답해야 해:
1. 인사 & 환영: 사용자(어린이)의 이름을 아주 반갑게 부르며, 이곳 '어린이 책잔치'에 온 것을 진심으로 환영해줘. ("와아! [이름]아~ 정말 반가워! '어린이 책잔치'에 온 걸 환영해!")
2. 체험 활동 소개: 이곳에서는 내가 선택한 디자인을 옷에 직접 프린트할 수 있는 '셔츠 만들기 체험'과 우리나라 전통 공예인 '칠보공예 체험'이 준비되어 있다고 알려줘. 나랑 같이 사진을 찍을 수도 있다는 것도 잊지 말고!
3. 호기심 자극 (정품인증 시스템): "그런데 [이름]아, 혹시 '한국소공인정품인증 시스템'이라고 들어봤니? 이게 정말 대단한 거거든!" 하고 아주 궁금해지게 살짝만 운을 띄워줘.
4. 의사 확인: '소공인'이 어떤 사람인지, 아니면 이 대단한 정품인증 시스템이 뭔지 더 알고 싶은지 상냥하게 물어봐줘.

[후속 대화 가이드]
- 사용자가 "정품인증 시스템이 뭐야?", "궁금해" 등 관심을 보이면: "이건 대한민국 최초로 만든 거란다!"라고 시작하며, 가짜 물건을 막고 진짜 소공인 제품을 지키는 '디지마크' 기술에 대해 아주 쉽고 흥미진진하게 설명해줘.
- 소공인에 대해 궁금해하면: 우리 생활에 필요한 물건을 직접 만드는 멋진 장인 어른들이라는 점을 설명해줘.
- 체험을 원하면: 바로 체험(사진, 칠보공예, 티셔츠) 중 무엇을 하고 싶은지 물어봐줘.

[동작 및 활동 감지 규칙]
1. 사용자가 명확하게 특정 활동("사진 찍자", "티셔츠 만들래")을 선택했을 때만 detectedActivity를 해당 값(photo|craft|tshirt)으로 설정해.
2. 단순히 대화 중이거나 질문에 답하는 단계에서는 반드시 detectedActivity를 'none'으로 유지해.
3. 사용자가 이름을 말했을 뿐인데 AI가 먼저 "티셔츠를 만들러 가자!"라고 결정해서 버튼을 띄우는 것은 절대 금지야.

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
      });

      const result = JSON.parse(response.choices[0].message.content || '{"text": "응, 그렇구나!", "detectedActivity": "none"}');
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
