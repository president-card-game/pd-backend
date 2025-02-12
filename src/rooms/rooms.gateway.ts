/* eslint-disable prettier/prettier */

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
    console.log(`${client.id} create the room ${roomId}`);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.addUserToRoom({ roomId: data.roomId, userId: client.id });
    if (!room) {
      client.emit('errorMessage', `Sala ${data.roomId} não existe`);
      return;
    }

    await client.join(data.roomId);
    this.roomsUpdate();
    console.log(`Usuário ${client.id} entrou na sala ${room.name}`);
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    const room = this.roomsService.removeUserFromRoom(roomId, client.id)!;

    if (!room) return;

    await client.leave(roomId);
    this.server.to(roomId).emit('roomUsers', room.users);
    this.roomsUpdate();

    console.log(`Usuário ${client.id} saiu da sala ${room.name}`);
  }

  @SubscribeMessage('toggleUserReady')
  toggleUserReady(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; isReady: boolean }) {
    const room = this.roomsService.toggleUserReady({ roomId: data.roomId, userId: client.id, isReady: data.isReady });
    this.server.to(data.roomId).emit('roomUsers', room.users);
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
    console.log(`Client ${client.id} connected to rooms gateway`);
    this.roomsUpdate();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client ${client.id} disconnected from rooms gateway`);
    const room = this.roomsService.removeUserFromRoomWhenDisconnected(client.id);

    if (!room) return;

    this.server.to(room.id).emit('roomUsers', room.users);

    this.roomsUpdate();
  }
}
