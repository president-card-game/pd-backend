import { Injectable } from '@nestjs/common';
import { Room, RoomsService } from '../rooms';
import { DECK, ICard } from '../../shared/constants/deck.constant';
import { CardPlay, Game, PlayedCard } from './game.interface';

@Injectable()
export class GameService {
  private games: Game[] = [];

  constructor(private readonly roomsService: RoomsService) {}

  public startGame(room: Room, playerId: string) {
    const haveMinimumPlayers = room.users.length >= 1;

    if (!haveMinimumPlayers) return 'Para iniciar o jogo é necessário ter 2 jogadores';

    const user = room.users.find(({ id }) => id === playerId);

    if (!user?.isHost) return 'Somente o host pode iniciar o jogo';

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
    const cards: { [Key in (typeof playersId)[number]]: ICard[] } = {};
    const remainingCards = [...DECK];
    let playerIndex = 0;

    DECK.forEach(() => {
      const randomIndex = Math.floor(Math.random() * remainingCards.length);
      const card = remainingCards[randomIndex];
      const playerId = playersId[playerIndex];
      const playerCards = cards[playerId] || [];

      cards[playerId] = [...playerCards, card];

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

  public playCard(roomId: string, playerId: string, playedCardsObj: CardPlay[]) {
    if (playedCardsObj.length > 4) return `Você pode jogar no máximo 4 cartas por vez`;

    const playedCardsIds = playedCardsObj.map(({ id }) => id);
    const game = this.findGameById(roomId);

    if (!game) return `O jogo ${roomId} não existe`;

    const user = game.players.find(({ id }) => id === playerId);

    if (!user) return `Não existe nenhum jogador com o id ${playerId} na sala ${roomId}`;

    const haveCards = !user.cards
      ? false
      : playedCardsIds.every((current) => {
          const card = user.cards!.some(({ id: userCardId }) => userCardId === current);

          return !!card;
        });

    const { length: numberOfCardsPlayed } = playedCardsObj;

    if (!!numberOfCardsPlayed && !haveCards) return 'Você não possui essa carta';

    const isTurnOfUser = game.whoIsPlaying === playerId;

    if (!isTurnOfUser) return 'Não é sua vez de jogar';

    let canPlayCard = true;

    let lastPlays = game.lastPlays.filter(({ cards }) => !!cards);
    const lastPlay = lastPlays.at(-1);

    const hasTheSameNumberOfCardsOfLastPlay = !!numberOfCardsPlayed && lastPlay && numberOfCardsPlayed !== lastPlay.cards?.length;
    if (hasTheSameNumberOfCardsOfLastPlay) canPlayCard = false;

    const skipped = canPlayCard && !numberOfCardsPlayed;
    if (!skipped) {
      canPlayCard = numberOfCardsPlayed > 1 ? this.canPlaySequence(game, playedCardsObj) : !lastPlays.length || this.canPlaySingleCard(game, playedCardsObj[0].id);
    }

    if (!canPlayCard) return 'Esta jogada é inválida';

    const { cards } = user;

    const playersUpdated = game?.players.map((player) => {
      if (player.id !== playerId) return player;

      const cardsUpdated = cards?.filter((card: ICard) => !playedCardsIds?.includes(card.id));
      return { ...player, cards: cardsUpdated || null };
    });

    const nextPlayer = this.getNextPlayer(playerId, game.playersSequence!);

    if (!numberOfCardsPlayed) lastPlays = [...lastPlays, { userId: playerId, cards: null }];
    else {
      const cards: PlayedCard[] = DECK.filter((card) => playedCardsIds.includes(card.id)).map((card): PlayedCard => {
        const isJoker = card.visibleValue === 'joker';

        if (!isJoker) return card;

        const obj = playedCardsObj.find(({ id }) => id === card.id);

        return { ...card, hasValueOf: obj?.hasValueOf };
      });

      lastPlays = [...lastPlays, { userId: playerId, cards }];
    }

    const updatedProperties: Partial<Game> = { lastPlays, players: playersUpdated, whoIsPlaying: nextPlayer as string };
    this.updateGame(game.id, updatedProperties);

    return { ...game, ...updatedProperties };
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

  private canPlaySequence({ lastPlays }: Game, playedCardsObj: CardPlay[]) {
    const lastPlay = lastPlays.filter(({ cards }) => !!cards).at(-1);

    let playedCards = playedCardsObj.map(({ id, hasValueOf }) => {
      const isJoker = id === 53 || id === 54;
      return this.getCardById(isJoker ? hasValueOf! : id);
    });

    if (playedCards.some((card) => !card)) return false;

    playedCards = playedCards.sort((a, b) => a!.rateValue - b!.rateValue);

    if (lastPlay && lastPlay.cards) {
      const cardsSorted = [...lastPlay.cards].sort((a, b) => a.rateValue - b.rateValue);

      let [firstCard, secondCard] = cardsSorted;

      if (firstCard.hasValueOf) firstCard = this.getCardById(firstCard.hasValueOf)!;
      if (secondCard.hasValueOf) secondCard = this.getCardById(secondCard.hasValueOf)!;

      const lastPlayIsSameRate = firstCard.rateValue === secondCard.rateValue;

      if (lastPlayIsSameRate && playedCards[0]!.rateValue < secondCard.rateValue) return false;

      if (!lastPlayIsSameRate && playedCards[0]!.rateValue <= secondCard.rateValue) return false;
    }

    const isValidSequence = playedCardsObj?.every(({ id, hasValueOf }, index) => {
      if (!index) return true;

      const isJoker = id === 53 || id === 54;
      const idToFind = isJoker ? hasValueOf : id;
      const card = this.getCardById(idToFind!);

      if (!card) return false;

      const previousCard = playedCards[index - 1];

      const hasSameRate = card.rateValue === previousCard?.rateValue;
      if (hasSameRate) return true;

      let rateValue = card.rateValue - 1;

      if (card.suitName === 'clubs' && card.visibleValue === 'K' && previousCard?.visibleValue !== 'K') rateValue--;

      const isSequentialSameSuit = rateValue === previousCard!.rateValue && card.suitName === previousCard!.suitName;
      if (isSequentialSameSuit) return true;

      console.log(rateValue);
      console.log(previousCard?.rateValue);

      return false;
    });

    return isValidSequence;
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
