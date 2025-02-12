import { v4 } from 'uuid';

import { Injectable } from '@nestjs/common';

interface User {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
}

interface Room {
  id: string;
  name: string;
  users: User[];
}

@Injectable()
export class RoomsService {
  private rooms: Room[] = [];

  createRoom(name: string) {
    const roomId = v4();
    if (!this.rooms.find((room) => room.name === name)) {
      const newRoom: Room = { id: roomId, name, users: [] };
      this.rooms.push(newRoom);
    }
    return roomId;
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getRoomById(id: string): Room | undefined {
    return this.rooms.find((r) => r.id === id);
  }

  getUserById(id: string): User | undefined {
    const room = this.rooms.find((r) => r.users.some((user) => user.id === id));
    if (!room) return undefined;
    return room.users.find((user) => user.id === id);
  }

  findRoomByUserId(userId: string): Room | undefined {
    return this.rooms.find((r) => r.users.some((user) => user.id === userId));
  }

  addUserToRoom({ roomId, userId }: { roomId: string; userId: string }) {
    const room = this.getRoomById(roomId);
    const isHost = !room?.users.length;
    const userIsAlreadyInTheRoom = !room?.users.some((user) => user.id === userId);

    if (room && userIsAlreadyInTheRoom) {
      room.users.push({ id: userId, name: userId, isReady: isHost, isHost });
    }

    return room;
  }

  toggleUserReady({ roomId, userId, isReady }: { roomId: string; userId: string; isReady: boolean }) {
    console.log(`Toggling user ${userId} ready status to ${isReady} in room ${roomId}`);
    const room = this.getRoomById(roomId);
    if (!room) throw new Error('Sala não encontrada');

    const user = room.users.find((user) => user.id === userId);
    if (!user) throw new Error('Usuário não encontrado');

    console.log({ isReady });
    console.log({ newIsReady: !isReady });

    const updatedRoom = {
      ...room,
      users: room.users.map((user) => (user.id === userId ? { ...user, isReady: !isReady } : user)),
    };

    this.rooms = [...this.rooms.filter((r) => r.id !== roomId), updatedRoom];

    return updatedRoom;
  }

  removeUserFromRoom(roomId: string, userId: string) {
    const room = this.getRoomById(roomId);

    if (!room) return;

    room.users = room.users.filter((user) => user.id !== userId);
    this.rooms = [...this.rooms.filter((r) => r.id !== roomId), room];
    return room;
  }

  removeUserFromRoomWhenDisconnected(userId: string): Room | undefined {
    const room = this.rooms.find((r) => r.users.some((user) => user.id === userId));

    if (!room) return;

    room.users = room.users.filter((user) => user.id !== userId);
    this.rooms = [...this.rooms.filter((r) => r.id !== room.id), room];
    return room;
  }
}
