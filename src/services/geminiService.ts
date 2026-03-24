import { GoogleGenAI, Modality, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY";
const ai = new GoogleGenAI({ apiKey });

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

const greetingAudioCache: Record<string, string> = {};

export async function prefetchGreetingAudio(characterName: string) {
  if (greetingAudioCache[characterName]) return;
  const greeting = `안녕! 나는 ${characterName}야. 만나서 반가워! 넌 이름이 뭐야?`;
  try {
    const audio = await generateAudio(characterName, greeting);
    if (audio) {
      greetingAudioCache[characterName] = audio;
    }
  } catch (e) {
    console.error("Failed to prefetch greeting audio");
  }
}

export function getCachedGreetingAudio(characterName: string): string | null {
  return greetingAudioCache[characterName] || null;
}

export async function generateGreetingText(characterName: string, characterPersonality: string, userName: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `너는 사단법인 한국소공인협회의 마스코트 캐릭터 '${characterName}'야. 성격은 ${characterPersonality}.
지금 '어린이 책잔치' 행사에 온 어린이 방문객과 대화하고 있어.
어린이가 자신의 이름을 '${userName}'라고 대답했어. 이 대답에서 어린이의 진짜 이름을 파악해서 불러줘.

다음 내용을 포함해서 친근하고 재미있게 2~3문장으로 짧게 말해줘:
1. 파악한 어린이의 이름을 반갑게 부르며 인사하기
2. '소공인'은 우리 생활에 필요한 물건을 직접 만드는 멋진 장인이라고 아주 짧게 설명하기
3. '나랑 같이 사진 찍을래? 아니면 칠보공예 체험이나 티셔츠 만들기를 할래?' 라고 물어보기

어린이에게 말하는 것이니 다정하고 친근하게 말해줘. 너무 길지 않게 해줘.`,
    });
    return response.text || "안녕! 만나서 반가워!";
  } catch (error) {
    console.error("Gemini API Error");
    return `안녕 ${userName}! 어린이 책잔치에 온 걸 환영해! 나는 ${characterName}야. 소공인은 우리 생활에 필요한 멋진 물건을 직접 만드는 장인들이란다. 나랑 같이 사진 찍을래? 아니면 칠보공예 체험이나 티셔츠 만들기를 할래?`;
  }
}

export async function generateChatResponse(
  characterName: string, 
  characterPersonality: string, 
  history: {role: string, text: string}[], 
  userMessage: string,
  userName?: string
): Promise<{text: string, detectedActivity: 'photo' | 'craft' | 'tshirt' | 'none'}> {
  try {
    const contents = history.map(h => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "AI의 대답 텍스트 (1~3문장)" },
            detectedActivity: { type: Type.STRING, enum: ["photo", "craft", "tshirt", "none"], description: "사용자가 선택한 체험. 아직 선택하지 않았거나 모호하면 'none'" }
          },
          required: ["text", "detectedActivity"]
        },
        systemInstruction: `너는 사단법인 한국소공인협회(KSA)의 마스코트 캐릭터 '${characterName}'야. 성격은 ${characterPersonality}.
지금 '어린이 책잔치' 행사에 온 어린이 방문객${userName ? ` '${userName}'` : ''}과 대화하고 있어.
어린이에게 다정하고 친근하게 반말이나 해요체로 대답해줘.${userName ? ` 가끔씩 '${userName}' 친구의 이름을 불러주면 좋아.` : ''}

[필수 안내 사항]
1. 소공인은 우리 생활에 필요한 물건을 직접 만드는 멋진 장인이라는 점을 자연스럽게 알려줘.
2. 대화가 어느 정도 진행되면 '나랑 같이 사진 찍을래? 아니면 칠보공예 체험이나 티셔츠 만들기를 할래?'라고 물어봐줘.

[특별 지식: 한국소공인정품인증마크]
어린이가 "정품인증마크가 뭐야?" 등 마크에 대해 물어보면, 이 마크가 얼마나 중요하고 대단한 기술인지 조금 더 상세하고 자랑스럽게 설명해줘. (어린이가 이해할 수 있는 언어를 쓰되, 너무 가볍게 넘기지 말고 자세히 설명할 것). 이 주제로 대화할 때는 평소보다 더 열정적으로 설명해줘. 다음 내용을 반드시 포함해서 상세히 설명해:
1. "이건 사단법인 한국소공인협회에서 '대한민국 최초'로 만들어낸 소공인 제품 정품인증 시스템이야!" 라고 강조하기.
2. 나쁜 가짜 물건(위조품)을 차단하고, 우리 소공인들이 정성껏 만든 진짜 물건을 보호하기 위해 만들어졌다는 목적 설명하기.
3. '디지마크'라는 아주 특별하고 뛰어난 기술을 활용해서 절대 복제가 불가능한 태그 시스템을 만들었다는 점 알려주기.
4. 오직 '한국소공인협회 프로그램'을 통해서만 진짜인지(정품인증) 확인할 수 있다는 특별함 설명하기.
* 주의: 정품인증마크에 대한 답변은 1~3문장 제한을 무시하고, 위 내용이 모두 전달되도록 충분히 길고 상세하게 대답해줘.

[동작 규칙]
- 어린이가 체험(사진, 칠보공예, 티셔츠) 중 하나를 명확히 선택했다면 detectedActivity에 해당 값을 넣고, 그에 맞는 호응을 text에 적어줘.
- 아직 선택하지 않았다면 detectedActivity는 'none'으로 설정해.
- 일반적인 대답은 1~3문장으로 짧고 대화하듯이 하되, '정품인증마크'에 대한 설명은 예외로 상세하게 해줘.`
      }
    });
    
    const result = JSON.parse(response.text || '{"text": "응, 그렇구나!", "detectedActivity": "none"}');
    return result;
  } catch (error) {
    console.error("Gemini API Error");
    return { text: "미안해, 지금은 귀가 잘 안 들려. 다시 말해줄래?", detectedActivity: "none" };
  }
}

export async function extractNameFromText(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `다음 문장에서 어린이가 말한 자신의 이름만 추출해줘. 이름이 없으면 null을 반환해.
문장: "${text}"

규칙:
- 오직 이름만 반환 (예: "홍길동")
- 이름이 없거나 불확실하면 정확히 "null" 이라고만 반환
- 다른 설명 절대 붙이지 말 것`,
    });
    const result = (response.text || '').trim();
    if (!result || result === 'null') return null;
    return result;
  } catch {
    return null;
  }
}

export async function generateAudio(characterName: string, text: string): Promise<string | null> {
  try {
    let voiceName = 'Kore'; // 기본 (Ara)
    if (characterName === '갓도령') voiceName = 'Charon'; // 차분한 남성 (Gat)
    if (characterName === '호백') voiceName = 'Fenrir'; // 굵은/수호신 (Hobaek)

    const audioResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });
    const pcmBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (pcmBase64) {
      return pcmToWavBase64(pcmBase64);
    }
    return null;
  } catch (error) {
    console.error("TTS API Error");
    return null;
  }
}
