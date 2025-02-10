/* eslint-disable prettier/prettier */
import { Server, Socket } from 'socket.io';

import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { RoomsService } from '../rooms/rooms.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('startGame')
  startGame(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.getRoomById(roomId);
    if (!room) {
      client.emit('errorMessage', `Sala ${roomId} não existe`);
      return;
    }

    console.log(`Jogo iniciado na sala ${room.name}`);
    this.server.to(roomId).emit('gameStarted', { roomId, players: room.users });
  }

  @SubscribeMessage('playCard')
  playCard(@MessageBody() { roomId, playerId, card }: { roomId: string; playerId: string; card: string }) {
    console.log(`Jogador ${playerId} jogou a carta ${card} na sala ${roomId}`);
    this.server.to(roomId).emit('cardPlayed', { playerId, card });
  }
}
