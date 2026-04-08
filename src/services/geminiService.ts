export async function prefetchGreetingAudio(characterName: string, personality: string) {
  if (greetingAudioCache[characterName]) return;
  const greeting = `안녕? 나는 ${characterName}야. 만나서 반가워~ 넌 이름이 뭐야?`;
  console.log(`Prefetching greeting audio for ${characterName}`);
  
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
const greetingAudioCache: Record<string, Promise<string | null>> = {};

export async function generateAudio(characterName: string, text: string): Promise<string | null> {
  const cacheKey = `${characterName}|${text}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey) || null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('/api/tts/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName, text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Google TTS] Error ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.audioContent) {
      const audio = `data:audio/mp3;base64,${data.audioContent}`;
      audioCache.set(cacheKey, audio);
      return audio;
    }
    return null;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[Google TTS] Fetch error:', error);
    return null;
  }
}
