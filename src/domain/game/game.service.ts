import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';
import { DECK, ICard } from '../../shared/constants/deck.constant';
import { Room, RoomsService } from '../rooms';
import { CardToPlay, Game, Play, PlayedCard, PlayerCards } from './game.interface';

@Injectable()
export class GameService {
  private games: Game[] = [];

  constructor(private readonly roomsService: RoomsService) {}

  public startGame(room: Room, playerId: string) {
    const haveMinimumPlayers = room.users.length >= 1;

    if (!haveMinimumPlayers) return 'Para iniciar o jogo é necessário ter 2 jogadores';

    const player = room.users.find(({ id }) => id === playerId);

    if (!player?.isHost) return 'Somente o host pode iniciar o jogo';

    const allPlayersReady = room.users.every(({ isReady }) => isReady);

    if (!allPlayersReady) return 'Para iniciar o jogo é necessário que todos os jogadores estejam prontos';

    const { users } = room;

    const game: Game = {
      id: room.id,
      players: users.map(({ id }) => ({ id, cards: null })),
      isStarted: false,
      lastPlays: [],
    };

    this.games.push(game);

    this.roomsService.updateRoomProperties(room.id, { isPlaying: true });

    return game;
  }

  public drawSequenceOfPlayers(room: Room) {
    const playersId = room.users.map(({ id }) => id);
    const remainingCards = [...DECK];

    const shuffleFirstCard = playersId.map((id) => {
      const cardIndex = Math.floor(Math.random() * remainingCards.length);
      const card = remainingCards[cardIndex];

      remainingCards.splice(cardIndex, 1);

      return { id, card };
    });

    const sorted = shuffleFirstCard.sort((player1, player2) => player2.card.rateValue - player1.card.rateValue);

    const playersSequence = shuffleFirstCard.map(({ id }) => id);

    this.updateGame(room.id, { playersSequence, whoIsPlaying: playersSequence[0] });

    return sorted;
  }

  public shuffleCards(room: Room): Game {
    const game = this.findGameById(room.id)!;
    const playersId = room.users.map(({ id }) => id);
    const cards: { [Key in (typeof playersId)[number]]: PlayerCards[] } = {};
    const remainingCards = [...DECK];
    let playerIndex = 0;

    DECK.forEach(() => {
      const randomIndex = Math.floor(Math.random() * remainingCards.length);
      const card = remainingCards[randomIndex];
      const playerId = playersId[playerIndex];
      const playerCards = cards[playerId] || [];

      cards[playerId] = [...playerCards, { ...card, id: v4(), deckId: card.id }];

      playerIndex = (playerIndex + 1) % playersId.length;

      remainingCards.splice(randomIndex, 1);
    });

    const players = game.players.map((player) => ({ ...player, cards: cards[player.id] }));

    const updatedProperties = { players, isStarted: true };
    this.updateGame(game.id, updatedProperties);

    return { ...game, ...updatedProperties };
  }

  public findGameById(roomId: string) {
    const game = this.games.find(({ id }) => id === roomId);

    return game;
  }

  public findGameByPlayerId(playerId: string) {
    const game = this.games.find(({ players }) => players.some((player) => player.id === playerId));

    return game;
  }

  public playCard(playerId: string, playedCardsObj: CardToPlay[] = []) {
    const game = this.findGameByPlayerId(playerId);

    if (!game) return `Você não está jogando`;
    const player = game.players.find((player) => player.id === playerId)!;

    const playedCards = playedCardsObj.map(({ id, hasValueOf }) => {
      const card = player.cards?.find((card) => card.id === id) as PlayerCards;

      return { ...card, hasValueOf };
    });

    const haveCards = !player.cards
      ? false
      : playedCards.every(({ id }) => {
          const card = player.cards!.some((card) => card.id === id);

          return !!card;
        });

    const { length: numberOfCardsPlayed } = playedCardsObj;

    if (!!numberOfCardsPlayed && !haveCards) return 'Você não possui essa carta';

    const isMyTurn = game.whoIsPlaying === playerId;

    if (!isMyTurn) return 'Não é sua vez de jogar';

    let canPlayCard = true;

    const lastPlays = game.lastPlays.filter(({ cards }) => !!cards);
    const lastPlay = lastPlays.at(-1);

    const skipped = !numberOfCardsPlayed;

    const hasTheSameNumberOfCardsOfLastPlay = !skipped && lastPlay && numberOfCardsPlayed !== lastPlay.cards?.length;
    if (hasTheSameNumberOfCardsOfLastPlay) canPlayCard = false;

    if (!skipped) {
      if (numberOfCardsPlayed > 1) canPlayCard = this.canPlaySequence(game, playedCards);
      else {
        const { deckId } = player.cards?.find(({ id }) => id === playedCardsObj[0].id) as PlayerCards;
        canPlayCard = !lastPlays.length || this.canPlaySingleCard(game, deckId);
      }
    }

    if (!canPlayCard) return 'Esta jogada é inválida';

    const updatedProperties = this.updateGameTurn(game, playerId, playedCards);

    let isNewRound = false;
    if (skipped && updatedProperties.lastPlays) {
      const playersLength = game.players.length;
      const lastPlays = [...updatedProperties.lastPlays].reverse();
      const roundPlays = lastPlays?.slice(0, playersLength - 1);
      const roundHasEnd = roundPlays?.every(({ cards }) => !cards);
      const allUsersPlayed = lastPlays.length >= playersLength;

      if (roundHasEnd && allUsersPlayed) {
        const roundWinner = lastPlays.find(({ cards }) => !!cards);

        updatedProperties.whoIsPlaying = roundWinner?.userId;
        updatedProperties.lastPlays = [];
        isNewRound = true;
      }
    }

    this.updateGame(game.id, updatedProperties);

    return { game: { ...game, ...updatedProperties }, isNewRound };
  }

  updateGameTurn(game: Game, playerId: string, playedCards: (CardToPlay & { deckId: number })[]): Partial<Game> {
    const playedCardsIds = playedCards.map(({ id }) => id);

    const playersUpdated = game.players.map((player) => {
      if (player.id !== playerId) return player;

      const cardsUpdated = player.cards?.filter((card: PlayerCards) => !playedCardsIds.includes(card.id));

      return { ...player, cards: cardsUpdated || null };
    });

    const lastPlays = game.lastPlays;
    let updatedLastPlays: Play[];

    if (!playedCardsIds.length) updatedLastPlays = [...lastPlays, { userId: playerId, cards: null }];
    else {
      const cards: PlayedCard[] = playedCards.map(({ deckId, hasValueOf }) => {
        const card = DECK.find(({ id }) => id === deckId);

        return { ...card, hasValueOf };
      }) as PlayedCard[];
      const treatedCards = cards.map((card): PlayedCard => {
        const isJoker = this.checkIfIsJoker(card.id);

        if (!isJoker) return card;

        const obj = playedCards.find(({ deckId }) => deckId === card.id);

        return { ...card, hasValueOf: obj?.hasValueOf };
      });

      updatedLastPlays = [...lastPlays, { userId: playerId, cards: treatedCards }];
    }

    const nextPlayer = this.getNextPlayer(playerId, game.playersSequence!);

    return { players: playersUpdated, whoIsPlaying: nextPlayer as string, lastPlays: updatedLastPlays };
  }

  private getNextPlayer(playerId: string, playersSequence: string[]) {
    return playersSequence.reduce((previous: string, id, index) => {
      if (previous) return previous;

      if (id === playerId) {
        const nextIndex = (index + 1) % playersSequence.length;

        return playersSequence[nextIndex];
      }
    }, null);
  }

  private getCardById(cardId: number) {
    return DECK.find(({ id }) => id === cardId);
  }

  private canPlaySingleCard(game: Game, cardId: number) {
    const [lastPlay] = game.lastPlays.filter(({ cards }) => !!cards);

    const lastCardPlayed = lastPlay.cards![0];
    const card = this.getCardById(cardId);

    if (!card) return false;

    return card.rateValue > lastCardPlayed.rateValue;
  }

  private canPlaySequence({ lastPlays }: Game, playedCards: (CardToPlay & { deckId: number })[]) {
    const lastPlay = lastPlays.filter(({ cards }) => !!cards).at(-1);

    const cards = playedCards
      .map(({ deckId, hasValueOf }) => {
        const isJoker = this.checkIfIsJoker(deckId);

        return this.getCardById(isJoker ? hasValueOf! : deckId);
      })
      .sort((a, b) => a!.rateValue - b!.rateValue) as ICard[];

    if (!cards) return false;

    if (lastPlay?.cards) {
      let [lowerCard, secondLowerCard] = [...lastPlay.cards].sort((a, b) => a.rateValue - b.rateValue);

      if (this.checkIfIsJoker(lowerCard.id)) lowerCard = this.getCardById(lowerCard.hasValueOf!)!;
      if (this.checkIfIsJoker(secondLowerCard.id)) secondLowerCard = this.getCardById(secondLowerCard.hasValueOf!)!;

      const lastPlayIsSameRate = lowerCard.rateValue === secondLowerCard.rateValue;
      const playedCardsIsSameRate = cards[0].rateValue === cards[1].rateValue;

      if (lastPlayIsSameRate && !playedCardsIsSameRate && cards[0].rateValue < secondLowerCard.rateValue) return false;

      if (lastPlayIsSameRate && playedCardsIsSameRate && cards[0].rateValue <= secondLowerCard.rateValue) return false;

      if (!lastPlayIsSameRate && cards[0].rateValue < secondLowerCard.rateValue) return false;
    }

    const isValidSequence = playedCards?.every(({ deckId, hasValueOf }, index) => {
      if (!index) return true;

      const isJoker = this.checkIfIsJoker(deckId);
      const card = this.getCardById(isJoker ? hasValueOf! : deckId);

      if (!card) return false;

      const previousCard = cards[index - 1];

      const hasSameRate = card.rateValue === previousCard?.rateValue;
      if (hasSameRate) return true;

      let rateValue = card.rateValue - 1;

      if (card.suitName === 'clubs' && card.visibleValue === 'K' && previousCard?.visibleValue !== 'K') rateValue--;

      const isSequentialSameSuit = rateValue === previousCard.rateValue && card.suitName === previousCard.suitName;
      if (isSequentialSameSuit) return true;
      return false;
    });

    return isValidSequence;
  }

  private checkIfIsJoker(id: number) {
    const isJoker = id === 53 || id === 54;

    return isJoker;
  }

  public removeUser(id: string) {
    const room = this.roomsService.findRoomByUserId(id);

    if (!room) return;

    const updatedUsers = room.users.filter((u) => u.id !== id);
    const updatedRoom = this.roomsService.updateRoomProperties(room.id, { users: updatedUsers, isPlaying: !!updatedUsers.length });

    return updatedRoom;
  }

  private updateGame(id: string, propertiesToUpdate: Partial<Game>) {
    const gamesUpdated = this.games.map((game) => (game.id === id ? { ...game, ...propertiesToUpdate } : game));

    this.games = gamesUpdated;
  }
}
