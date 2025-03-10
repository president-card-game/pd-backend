import { ICard } from '@shared';

export interface PlayedCard extends ICard {
  hasValueOf?: number;
}
export interface Play {
  userId: string;
  cards: PlayedCard[] | null;
}

export interface PlayerCards extends Omit<ICard, 'id'> {
  id: string;
  deckId: number;
}

export interface Player {
  id: string;
  cards: PlayerCards[] | null;
}
export interface Game {
  id: string;
  players: Player[];
  lastPlays: Play[];
  isStarted: boolean;
  whoIsPlaying?: string;
  playersSequence?: string[];
}

export interface CardToPlay {
  id: string;
  hasValueOf?: number;
}
