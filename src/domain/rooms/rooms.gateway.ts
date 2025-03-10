import { Server, Socket } from 'socket.io';

import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { RoomsService } from './rooms.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomsService: RoomsService) {}

  @SubscribeMessage('createRoom')
  createRoom(@MessageBody() roomName: string, @ConnectedSocket() client: Socket) {
    const roomId = this.roomsService.createRoom(roomName);
    client.emit('roomCreated', { id: roomId, name: roomName });
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.addUserToRoom({ roomId, userId: client.id });
    if (!room) {
      client.emit('errorMessage', `Sala ${roomId} não existe`);
      return;
    }

    await client.join(roomId);
    this.roomsUpdate();
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(@ConnectedSocket() client: Socket) {
    const room = this.roomsService.removeUserFromRoom(client.id)!;

    if (!room) return;

    await client.leave(room.id);
    this.server.to(room.id).emit('roomUsers', room.users);
    this.roomsUpdate();
  }

  @SubscribeMessage('toggleUserReady')
  toggleUserReady(@ConnectedSocket() client: Socket) {
    const room = this.roomsService.toggleUserReady(client.id);
    this.server.to(room.id).emit('roomUsers', room.users);
  }

  @SubscribeMessage('getRooms')
  sendRooms(@ConnectedSocket() client: Socket) {
    client.emit('roomsUpdate', this.roomsService.getRooms());
  }

  @SubscribeMessage('getRoomUsers')
  getRoomUsers(@MessageBody() roomId: string) {
    const room = this.roomsService.getRoomById(roomId);
    if (!room) throw new Error('Sala não encontrada');

    this.server.to(roomId).emit('roomUsers', room.users);
  }

  roomsUpdate() {
    this.server.emit('roomsUpdate', this.roomsService.getRooms());
  }

  handleConnection(client: Socket) {
    client.emit('roomsUpdate', this.roomsService.getRooms());
  }

  handleDisconnect(client: Socket) {
    const room = this.roomsService.removeUserFromRoomWhenDisconnected(client.id);

    if (!room) return;

    this.server.to(room.id).emit('roomUsers', room.users);

    this.roomsUpdate();
  }
}
