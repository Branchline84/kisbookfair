export type Character = {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  color: string;
  image: string;
  profileImage?: string;
};

export type AppState =
  | 'SPLASH'
  | 'SELECT_CHARACTER'
  | 'CONVERSATION'
  | 'ACTIVITY_SELECT'
  | 'FAREWELL_CRAFT'
  | 'PHOTO_BOOTH'
  | 'PHOTO_REVIEW'
  | 'FAREWELL_PHOTO';
