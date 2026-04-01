import { Character } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'ara',
    name: '아라',
    emoji: '👧',
    personality: '전통의 미를 소중히 여기는 다정하고 솜씨 좋은 소녀 장인',
    color: 'bg-yellow-400',
    image: '/ara.mp4',
    idleImage: '/ara%20stay.mp4',
    fallbackImage: '/ara.png',
  },
  {
    id: 'gatdoryeong',
    name: '갓도령',
    emoji: '👦',
    personality: '새로운 기술과 전통을 잇는 지혜롭고 씩씩한 소년 선비',
    color: 'bg-green-600',
    image: '/gat-1.mp4',
    idleImage: '/gat%20stay.mp4',
    fallbackImage: '/gatimg.png',
  },
  {
    id: 'hobaek',
    name: '호백',
    emoji: '🐯',
    personality: '우리 소공인들의 물건을 지켜주는 든든하고 귀여운 수호신 백호',
    color: 'bg-slate-200',
    image: '/hobaek.mp4',
    idleImage: '/hobaek%20stay.mp4',
    fallbackImage: '/hobaek.png',
  },
];
