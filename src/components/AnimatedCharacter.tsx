import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

type Mood = 'neutral' | 'happy' | 'excited' | 'thinking';
type Mode = 'full' | 'profile';

export interface AnimatedCharacterProps {
  characterId: 'ara' | 'gatdoryeong' | 'hobaek';
  mood: Mood;
  isSpeaking: boolean;
  className?: string;
  mode?: Mode;
}

// ─────────────────────────────────────────────────────────────
// Shared animation hooks
// ─────────────────────────────────────────────────────────────

function useBlink(active = true) {
  const [isClosed, setIsClosed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setIsClosed(true);
        setTimeout(() => {
          setIsClosed(false);
          schedule();
        }, 130);
      }, 2800 + Math.random() * 3200);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [active]);
  return isClosed;
}

function useTalking(isSpeaking: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!isSpeaking) { setIsOpen(false); return; }
    const id = setInterval(() => setIsOpen(v => !v), 135);
    return () => clearInterval(id);
  }, [isSpeaking]);
  return isOpen;
}

// ─────────────────────────────────────────────────────────────
// ARA — 다정하고 솜씨 좋은 소녀 장인 (분홍 한복)
// ─────────────────────────────────────────────────────────────
function AraCharacter({ mood, isSpeaking, mode }: { mood: Mood; isSpeaking: boolean; mode: Mode }) {
  const blink = useBlink(mode === 'full');
  const talking = useTalking(isSpeaking);

  const eyeRY = mood === 'happy' ? 8 : mood === 'excited' ? 16 : 13;
  const browY = mood === 'excited' ? -5 : mood === 'happy' ? -3 : 0;
  const isHappyOrExcited = mood === 'happy' || mood === 'excited';

  return (
    <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Drop shadow */}
      <ellipse cx="100" cy="290" rx="52" ry="7" fill="rgba(0,0,0,0.07)" />

      {/* ── 치마 (chima skirt) ── */}
      <path d="M 62 198 Q 38 242 18 278 Q 58 284 100 284 Q 142 284 182 278 Q 162 242 138 198 Z" fill="#c2185b" />
      {/* 치마 윗단 */}
      <path d="M 62 198 Q 100 206 138 198 Q 148 208 138 214 Q 100 220 62 214 Q 52 208 62 198 Z" fill="#e91e8c" />

      {/* ── 저고리 (jeogori jacket) ── */}
      <path d="M 60 150 L 60 200 Q 80 196 100 196 Q 120 196 140 200 L 140 150 Q 120 145 100 145 Q 80 145 60 150 Z" fill="#f06292" />
      {/* 고름 (ribbon tie) */}
      <path d="M 84 150 L 100 170 L 116 150" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="100" y1="170" x2="100" y2="196" stroke="white" strokeWidth="3" />
      {/* 소매 (sleeves) */}
      <path d="M 60 158 Q 32 168 19 194" stroke="#f06292" strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M 140 158 Q 168 168 181 194" stroke="#f06292" strokeWidth="34" strokeLinecap="round" fill="none" />
      {/* 손 (hands) */}
      <ellipse cx="16" cy="197" rx="13" ry="11" fill="#fcd5b0" />
      <ellipse cx="184" cy="197" rx="13" ry="11" fill="#fcd5b0" />
      {/* 소매 단 cuffs */}
      <ellipse cx="19" cy="195" rx="10" ry="7" fill="#fff9c4" opacity="0.65" />
      <ellipse cx="181" cy="195" rx="10" ry="7" fill="#fff9c4" opacity="0.65" />

      {/* ── 목 (neck) ── */}
      <rect x="88" y="137" width="24" height="22" rx="6" fill="#fcd5b0" />

      {/* ── 얼굴 (face) ── */}
      <ellipse cx="100" cy="100" rx="47" ry="51" fill="#fcd5b0" />

      {/* ── 머리카락 (hair) ── */}
      {/* 뒤 쪽 머리 묶음 */}
      <circle cx="60" cy="72" r="26" fill="#1a1a2e" />
      <circle cx="140" cy="72" r="26" fill="#1a1a2e" />
      {/* 묶음 광택 */}
      <circle cx="54" cy="62" r="7" fill="#3d3d60" opacity="0.45" />
      <circle cx="134" cy="62" r="7" fill="#3d3d60" opacity="0.45" />
      {/* 앞머리 */}
      <path d="M 53 97 Q 55 64 76 57 Q 100 52 124 57 Q 145 64 147 97 Q 143 84 100 82 Q 57 84 53 97 Z" fill="#1a1a2e" />

      {/* ── 눈썹 (eyebrows) ── */}
      <path d={`M 74 ${83 + browY} Q 86 ${78 + browY} 96 ${82 + browY}`} stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M 104 ${82 + browY} Q 114 ${78 + browY} 126 ${83 + browY}`} stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* ── 눈 (eyes) ── */}
      {blink ? (
        <>
          <path d="M 74 103 Q 86 98 98 103" stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 102 103 Q 114 98 126 103" stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* 왼쪽 눈 */}
          <ellipse cx="86" cy="103" rx="13" ry={eyeRY} fill="white" />
          <circle cx="88" cy="104" r="8.5" fill="#2d1b0a" />
          <circle cx="91" cy="100" r="3.5" fill="white" />
          {mood === 'excited' && <circle cx="84" cy="107" r="2.5" fill="white" opacity="0.9" />}
          {/* 오른쪽 눈 */}
          <ellipse cx="114" cy="103" rx="13" ry={eyeRY} fill="white" />
          <circle cx="116" cy="104" r="8.5" fill="#2d1b0a" />
          <circle cx="119" cy="100" r="3.5" fill="white" />
          {mood === 'excited' && <circle cx="112" cy="107" r="2.5" fill="white" opacity="0.9" />}
        </>
      )}

      {/* ── 코 (nose) ── */}
      <ellipse cx="100" cy="117" rx="4" ry="3" fill="#e8a887" />

      {/* ── 볼 홍조 (cheeks) ── */}
      <ellipse cx="67" cy="121" rx="14" ry="9" fill="#ff8fab" opacity="0.42" />
      <ellipse cx="133" cy="121" rx="14" ry="9" fill="#ff8fab" opacity="0.42" />

      {/* ── 입 (mouth) ── */}
      {talking ? (
        <>
          <ellipse cx="100" cy="133" rx="12" ry="9" fill="#c2185b" />
          <path d="M 88 132 Q 100 128 112 132" fill="#ef9a9a" />
        </>
      ) : isHappyOrExcited ? (
        <path d="M 83 129 Q 100 145 117 129" stroke="#c2185b" strokeWidth="3.5" fill="#ff6090" strokeLinecap="round" />
      ) : mood === 'thinking' ? (
        <path d="M 90 131 Q 100 135 110 131" stroke="#c2185b" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 86 130 Q 100 141 114 130" stroke="#c2185b" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* ── 머리 장식 (hair ornaments) ── */}
      <circle cx="60" cy="59" r="8" fill="#ffd700" />
      <circle cx="60" cy="59" r="5" fill="#fff176" />
      <circle cx="140" cy="59" r="8" fill="#ffd700" />
      <circle cx="140" cy="59" r="5" fill="#fff176" />

      {/* ── 생각 중 손 포즈 (thinking hand) ── */}
      {mood === 'thinking' && (
        <>
          <ellipse cx="163" cy="148" rx="14" ry="12" fill="#fcd5b0" />
          <line x1="163" y1="136" x2="163" y2="120" stroke="#fcd5b0" strokeWidth="9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// GAT-DORYEONG — 지혜롭고 씩씩한 소년 선비 (갓 + 남색 한복)
// ─────────────────────────────────────────────────────────────
function GatDoryeongCharacter({ mood, isSpeaking, mode }: { mood: Mood; isSpeaking: boolean; mode: Mode }) {
  const blink = useBlink(mode === 'full');
  const talking = useTalking(isSpeaking);

  const eyeRY = mood === 'happy' ? 8 : mood === 'excited' ? 15 : 13;
  const browY = mood === 'excited' ? -5 : mood === 'happy' ? -3 : 0;
  const isHappyOrExcited = mood === 'happy' || mood === 'excited';

  return (
    <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Drop shadow */}
      <ellipse cx="100" cy="290" rx="52" ry="7" fill="rgba(0,0,0,0.07)" />

      {/* ── 바지 (baji pants) ── */}
      <path d="M 66 212 L 66 276 Q 88 280 100 276 Q 92 244 90 212 Z" fill="#4dd0e1" />
      <path d="M 134 212 L 134 276 Q 112 280 100 276 Q 108 244 110 212 Z" fill="#4dd0e1" />
      {/* 바지 단 */}
      <ellipse cx="74" cy="276" rx="14" ry="5" fill="#80deea" />
      <ellipse cx="126" cy="276" rx="14" ry="5" fill="#80deea" />

      {/* ── 저고리 (jeogori) ── */}
      <path d="M 57 152 L 57 216 Q 78 212 100 212 Q 122 212 143 216 L 143 152 Q 122 147 100 147 Q 78 147 57 152 Z" fill="#1565c0" />
      {/* 고름 */}
      <path d="M 83 152 L 100 174 L 117 152" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="100" y1="174" x2="100" y2="212" stroke="white" strokeWidth="3" />
      {/* 허리띠 */}
      <rect x="57" y="207" width="86" height="10" rx="4" fill="#0d47a1" />
      {/* 소매 */}
      <path d="M 57 160 Q 28 172 16 198" stroke="#1565c0" strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M 143 160 Q 172 172 184 198" stroke="#1565c0" strokeWidth="34" strokeLinecap="round" fill="none" />
      {/* 손 */}
      <ellipse cx="13" cy="201" rx="13" ry="11" fill="#fcd5b0" />
      <ellipse cx="187" cy="201" rx="13" ry="11" fill="#fcd5b0" />

      {/* 흥분 시 두루마리 */}
      {mood === 'excited' && (
        <>
          <rect x="176" y="172" width="22" height="32" rx="4" fill="#fff9c4" stroke="#f9a825" strokeWidth="2" />
          <line x1="179" y1="179" x2="195" y2="179" stroke="#f9a825" strokeWidth="1.5" />
          <line x1="179" y1="185" x2="195" y2="185" stroke="#f9a825" strokeWidth="1.5" />
          <line x1="179" y1="191" x2="195" y2="191" stroke="#f9a825" strokeWidth="1.5" />
          <line x1="179" y1="197" x2="195" y2="197" stroke="#f9a825" strokeWidth="1.5" />
        </>
      )}

      {/* ── 목 ── */}
      <rect x="88" y="140" width="24" height="22" rx="6" fill="#fcd5b0" />

      {/* ── 얼굴 ── */}
      <ellipse cx="100" cy="103" rx="46" ry="49" fill="#fcd5b0" />

      {/* ── 갓 (traditional hat) ── */}
      {/* 모자 챙 (brim — wide) */}
      <ellipse cx="100" cy="88" rx="74" ry="13" fill="#212121" />
      <ellipse cx="100" cy="91" rx="74" ry="6" fill="#37474f" opacity="0.45" />
      {/* 갓 몸통 crown */}
      <path d="M 68 87 Q 70 56 100 53 Q 130 56 132 87 Z" fill="#1a1a2e" />
      {/* 갓 꼭대기 */}
      <ellipse cx="100" cy="55" rx="34" ry="8" fill="#1a1a2e" />
      {/* 갓 띠 (band) */}
      <path d="M 60 88 Q 100 82 140 88 Q 140 93 100 96 Q 60 93 60 88 Z" fill="#0d0d1a" />
      {/* 갓끈 chin cord */}
      <path d="M 73 92 Q 63 110 68 125" stroke="#8d6e63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 127 92 Q 137 110 132 125" stroke="#8d6e63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 68 125 Q 100 130 132 125" stroke="#8d6e63" strokeWidth="2.5" fill="none" />
      {/* 귀 옆 머리카락 */}
      <path d="M 58 91 Q 60 102 58 110" stroke="#1a1a2e" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M 142 91 Q 140 102 142 110" stroke="#1a1a2e" strokeWidth="7" strokeLinecap="round" fill="none" />

      {/* ── 눈썹 ── */}
      <path d={`M 73 ${96 + browY} Q 85 ${91 + browY} 96 ${95 + browY}`} stroke="#3d2b1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={`M 104 ${95 + browY} Q 115 ${91 + browY} 127 ${96 + browY}`} stroke="#3d2b1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* 생각 중 — 한쪽 눈썹 치켜올림 */}
      {mood === 'thinking' && (
        <path d="M 104 91 Q 116 85 127 92" stroke="#3d2b1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}

      {/* ── 눈 ── */}
      {blink ? (
        <>
          <path d="M 73 108 Q 85 103 97 108" stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 103 108 Q 115 103 127 108" stroke="#2d1b0a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="85" cy="108" rx="13" ry={eyeRY} fill="white" />
          <circle cx="87" cy="109" r="8" fill="#2d1b0a" />
          <circle cx="90" cy="105" r="3" fill="white" />
          {mood === 'excited' && <circle cx="83" cy="112" r="2.5" fill="white" opacity="0.9" />}
          <ellipse cx="115" cy="108" rx="13" ry={eyeRY} fill="white" />
          <circle cx="117" cy="109" r="8" fill="#2d1b0a" />
          <circle cx="120" cy="105" r="3" fill="white" />
          {mood === 'excited' && <circle cx="113" cy="112" r="2.5" fill="white" opacity="0.9" />}
        </>
      )}

      {/* ── 코 ── */}
      <ellipse cx="100" cy="119" rx="4" ry="3" fill="#e8a887" />

      {/* ── 볼 홍조 ── */}
      <ellipse cx="67" cy="122" rx="13" ry="8" fill="#ffab91" opacity="0.38" />
      <ellipse cx="133" cy="122" rx="13" ry="8" fill="#ffab91" opacity="0.38" />

      {/* ── 입 ── */}
      {talking ? (
        <>
          <ellipse cx="100" cy="134" rx="12" ry="9" fill="#c62828" />
          <path d="M 88 133 Q 100 129 112 133" fill="#ef9a9a" />
        </>
      ) : isHappyOrExcited ? (
        <path d="M 83 131 Q 100 146 117 131" stroke="#c62828" strokeWidth="3.5" fill="#ef5350" strokeLinecap="round" />
      ) : mood === 'thinking' ? (
        <path d="M 88 133 Q 100 137 112 131" stroke="#c62828" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 85 131 Q 100 142 115 131" stroke="#c62828" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* ── 생각 중 손 ── */}
      {mood === 'thinking' && (
        <>
          <ellipse cx="162" cy="150" rx="14" ry="12" fill="#fcd5b0" />
          <line x1="162" y1="138" x2="162" y2="122" stroke="#fcd5b0" strokeWidth="9" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// HOBAEK — 든든하고 귀여운 수호신 백호
// ─────────────────────────────────────────────────────────────
function HobaekCharacter({ mood, isSpeaking, mode }: { mood: Mood; isSpeaking: boolean; mode: Mode }) {
  const blink = useBlink(mode === 'full');
  const talking = useTalking(isSpeaking);

  const eyeRY = mood === 'happy' ? 9 : mood === 'excited' ? 17 : 15;
  const browY = mood === 'excited' ? -6 : mood === 'happy' ? -3 : 0;
  const isHappyOrExcited = mood === 'happy' || mood === 'excited';

  return (
    <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Drop shadow */}
      <ellipse cx="100" cy="292" rx="58" ry="7" fill="rgba(0,0,0,0.07)" />

      {/* ── 꼬리 (tail — behind body) ── */}
      <path d="M 48 234 Q 18 202 28 172 Q 38 148 55 162 Q 44 177 50 193 Q 60 218 70 228 Z" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5" />
      <path d="M 36 174 Q 44 170 52 174" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 32 184 Q 41 180 50 184" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 36 194 Q 45 190 54 194" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* ── 몸통 (body) ── */}
      <ellipse cx="100" cy="228" rx="68" ry="62" fill="#f5f5f5" />
      {/* 배 (belly — lighter) */}
      <ellipse cx="100" cy="232" rx="42" ry="44" fill="#fffde7" />
      {/* 몸통 줄무늬 */}
      <path d="M 63 187 Q 74 183 85 187" stroke="#333" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 115 187 Q 126 183 137 187" stroke="#333" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 50 208 Q 59 204 68 208" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 132 208 Q 141 204 150 208" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* ── 앞발 (paws) ── */}
      <ellipse cx="44" cy="267" rx="27" ry="19" fill="#f0f0f0" />
      <ellipse cx="156" cy="267" rx="27" ry="19" fill="#f0f0f0" />
      {/* 발가락 */}
      <circle cx="33" cy="274" r="8" fill="#fce4ec" />
      <circle cx="44" cy="278" r="8" fill="#fce4ec" />
      <circle cx="55" cy="274" r="8" fill="#fce4ec" />
      <circle cx="145" cy="274" r="8" fill="#fce4ec" />
      <circle cx="156" cy="278" r="8" fill="#fce4ec" />
      <circle cx="167" cy="274" r="8" fill="#fce4ec" />

      {/* ── 팔 (arms) ── */}
      <ellipse cx="40" cy="215" rx="21" ry="17" fill="#f5f5f5" transform="rotate(-22 40 215)" />
      <ellipse cx="160" cy="215" rx="21" ry="17" fill="#f5f5f5" transform="rotate(22 160 215)" />

      {/* ── 목 연결 ── */}
      <ellipse cx="100" cy="167" rx="30" ry="16" fill="#f5f5f5" />

      {/* ── 머리 (head) ── */}
      <circle cx="100" cy="112" r="64" fill="#f5f5f5" />

      {/* ── 귀 (ears) ── */}
      {/* 왼쪽 귀 */}
      <path d="M 40 65 L 54 33 L 74 62" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />
      <path d="M 46 62 L 57 38 L 70 60" fill="#ffcdd2" />
      {/* 오른쪽 귀 */}
      <path d="M 126 62 L 146 33 L 160 65" fill="#f5f5f5" stroke="#e0e0e0" strokeWidth="1" />
      <path d="M 130 60 L 143 38 L 154 62" fill="#ffcdd2" />

      {/* ── 얼굴 줄무늬 (tiger face markings) ── */}
      {/* 이마 */}
      <path d="M 94 54 Q 100 47 106 54" stroke="#333" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 86 58 Q 100 51 114 58" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* 볼 줄무늬 */}
      <path d="M 46 101 Q 54 97 62 101" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 43 112 Q 52 108 61 112" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 138 101 Q 146 97 154 101" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 139 112 Q 148 108 157 112" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* ── 눈썹 ── */}
      <path d={`M 66 ${88 + browY} Q 80 ${82 + browY} 96 ${87 + browY}`} stroke="#5d4037" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d={`M 104 ${87 + browY} Q 120 ${82 + browY} 134 ${88 + browY}`} stroke="#5d4037" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* 생각 중 한쪽 치켜올림 */}
      {mood === 'thinking' && (
        <path d="M 104 83 Q 120 76 134 84" stroke="#5d4037" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}

      {/* ── 눈 ── */}
      {blink ? (
        <>
          <path d="M 65 106 Q 80 100 95 106" stroke="#3e2723" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 105 106 Q 120 100 135 106" stroke="#3e2723" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* 왼쪽 눈 */}
          <ellipse cx="80" cy="106" rx="16" ry={eyeRY} fill="white" />
          <circle cx="82" cy="107" r="10" fill="#e65100" />
          <circle cx="82" cy="107" r="6" fill="#1a1a1a" />
          <circle cx="86" cy="102" r="4" fill="white" />
          {mood === 'excited' && <circle cx="78" cy="111" r="3" fill="white" opacity="0.9" />}
          {/* 오른쪽 눈 */}
          <ellipse cx="120" cy="106" rx="16" ry={eyeRY} fill="white" />
          <circle cx="122" cy="107" r="10" fill="#e65100" />
          <circle cx="122" cy="107" r="6" fill="#1a1a1a" />
          <circle cx="126" cy="102" r="4" fill="white" />
          {mood === 'excited' && <circle cx="118" cy="111" r="3" fill="white" opacity="0.9" />}
        </>
      )}

      {/* ── 코 (tiger nose) ── */}
      <path d="M 91 125 Q 100 120 109 125 L 105 131 Q 100 134 95 131 Z" fill="#ff7043" />
      <line x1="100" y1="134" x2="100" y2="142" stroke="#ff7043" strokeWidth="3" />

      {/* ── 수염 (whiskers) ── */}
      <line x1="109" y1="132" x2="150" y2="127" stroke="#bbb" strokeWidth="1.5" opacity="0.6" />
      <line x1="109" y1="138" x2="150" y2="138" stroke="#bbb" strokeWidth="1.5" opacity="0.6" />
      <line x1="91" y1="132" x2="50" y2="127" stroke="#bbb" strokeWidth="1.5" opacity="0.6" />
      <line x1="91" y1="138" x2="50" y2="138" stroke="#bbb" strokeWidth="1.5" opacity="0.6" />

      {/* ── 입 ── */}
      {talking ? (
        <>
          <ellipse cx="100" cy="149" rx="14" ry="11" fill="#bf360c" />
          <path d="M 86 147 Q 100 143 114 147" fill="#ef9a9a" />
          <path d="M 94 143 L 92 150" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M 106 143 L 108 150" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : isHappyOrExcited ? (
        <>
          <path d="M 82 144 Q 100 159 118 144" stroke="#bf360c" strokeWidth="3.5" fill="#ef5350" strokeLinecap="round" />
          <path d="M 90 145 L 88 152" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M 110 145 L 112 152" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : mood === 'thinking' ? (
        <path d="M 87 146 Q 100 150 113 146" stroke="#bf360c" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M 84 145 Q 100 155 116 145" stroke="#bf360c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 90 146 L 88 153" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <path d="M 110 146 L 112 153" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        </>
      )}

      {/* ── 볼 홍조 ── */}
      <ellipse cx="63" cy="120" rx="14" ry="9" fill="#ffccbc" opacity="0.5" />
      <ellipse cx="137" cy="120" rx="14" ry="9" fill="#ffccbc" opacity="0.5" />

      {/* ── 생각 중 발 포즈 ── */}
      {mood === 'thinking' && (
        <ellipse cx="156" cy="150" rx="17" ry="15" fill="#f0f0f0" stroke="#ddd" strokeWidth="1" />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function AnimatedCharacter({ characterId, mood, isSpeaking, className = '', mode = 'full' }: AnimatedCharacterProps) {
  const isExcited = mood === 'excited';

  return (
    <motion.div
      className={`relative select-none ${className}`}
      animate={
        mode === 'full'
          ? isExcited
            ? { y: [0, -14, 0] }
            : { y: [0, -6, 0] }
          : {}
      }
      transition={
        mode === 'full'
          ? isExcited
            ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
    >
      {characterId === 'ara' && <AraCharacter mood={mood} isSpeaking={isSpeaking} mode={mode} />}
      {characterId === 'gatdoryeong' && <GatDoryeongCharacter mood={mood} isSpeaking={isSpeaking} mode={mode} />}
      {characterId === 'hobaek' && <HobaekCharacter mood={mood} isSpeaking={isSpeaking} mode={mode} />}
    </motion.div>
  );
}
