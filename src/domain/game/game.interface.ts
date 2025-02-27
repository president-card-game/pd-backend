import { ICard } from '@shared';

export interface PlayedCard extends ICard {
  hasValueOf?: number;
}

export interface Player {
  id: string;
  cards: ICard[] | null;
}

export interface Play {
  userId: string;
  cards: PlayedCard[] | null;
}

export interface Game {
  id: string;
  players: Player[];
  lastPlays: Play[];
  isStarted: boolean;
  whoIsPlaying?: string;
  playersSequence?: string[];
}

export interface CardPlay {
  id: number;
  hasValueOf?: number;
}
