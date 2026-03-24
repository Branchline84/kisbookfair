import { Character } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'ara',
    name: '아라',
    emoji: '👧',
    personality: '전통의 미를 소중히 여기는 다정하고 솜씨 좋은 소녀 장인',
    color: 'bg-yellow-400',
    image: '/araimg.png',
    profileImage: '/araimg.png',
  },
  {
    id: 'gatdoryeong',
    name: '갓도령',
    emoji: '👦',
    personality: '새로운 기술과 전통을 잇는 지혜롭고 씩씩한 소년 선비',
    color: 'bg-green-600',
    image: '/gat.mp4',
    profileImage: '/gatimg.png', // Assuming gatimg.png exists based on naming convention
  },
  {
    id: 'hobaek',
    name: '호백',
    emoji: '🐯',
    personality: '우리 소공인들의 물건을 지켜주는 든든하고 귀여운 수호신 백호',
    color: 'bg-slate-200',
    image: '/hobaekimg.png',
    profileImage: '/hobaekimg.png',
  },
];
