import { Server, Socket } from 'socket.io';

import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { RoomsService } from '../rooms/rooms.service';
import { GameService } from './game.service';
import { Room } from '../rooms';
import { CardToPlay } from './game.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  @SubscribeMessage('startGame')
  startGame(@ConnectedSocket() client: Socket) {
    const room = this.roomsService.findRoomByUserId(client.id);
    if (!room) {
      client.emit('errorMessage', `Você não está em uma sala`);
      return;
    }

    const result = this.gameService.startGame(room, client.id);

    if (typeof result == 'string') {
      client.emit('errorMessage', result);
      return;
    }

    setTimeout(() => {
      this.drawSequenceOfPlayers(room);
    }, 500);

    this.server.to(room.id).emit('gameStarted', result);
  }

  drawSequenceOfPlayers(room: Room) {
    const playersSequence = this.gameService.drawSequenceOfPlayers(room);

    this.server.to(room.id).emit('playersSequence', playersSequence);

    setTimeout(() => {
      this.shuffleCards(room);
    }, 500);
  }

  shuffleCards(room: Room) {
    const cards = this.gameService.shuffleCards(room);

    this.server.to(room.id).emit('game', cards);
  }

  @SubscribeMessage('getGame')
  getGame(@MessageBody() gameId: string, @ConnectedSocket() client: Socket) {
    const result = this.gameService.findGameById(gameId);

    if (!result) {
      client.emit('errorMessage', `Jogo ${gameId} não encontrado`);
      return;
    }

    client.emit('game', result);
  }

  @SubscribeMessage('playCard')
  playCard(@MessageBody() { cards }: { cards: CardToPlay[] }, @ConnectedSocket() client: Socket) {
    const result = this.gameService.playCard(client.id, cards);

    if (typeof result === 'string') {
      client.emit('errorMessage', result);
      return;
    }

    const { game, isNewRound } = result;

    this.server.to(game.id).emit('game', game);

    if (isNewRound) this.server.to(game.id).emit('newRound');
  }

  handleDisconnect({ id }: Socket) {
    const result = this.gameService.removeUser(id);

    if (result) this.server.to(result.id).emit('game', result);
  }
}
