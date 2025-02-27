import { v4 } from 'uuid';

import { Injectable } from '@nestjs/common';
import { Room, User } from './room.interface';

@Injectable()
export class RoomsService {
  private rooms: Room[] = [];

  createRoom(name: string) {
    const roomId = v4();
    const newRoom: Room = { id: roomId, name, users: [], isPlaying: false };

    this.rooms.push(newRoom);

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
    if (!room) return;
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
    const room = this.getRoomById(roomId);
    if (!room) throw new Error('Sala não encontrada');

    const user = room.users.find((user) => user.id === userId);
    if (!user) throw new Error('Usuário não encontrado');

    const updatedUsers = room.users.map((user) => (user.id === userId ? { ...user, isReady: !isReady } : user));

    this.updateRoomProperties(room.id, { users: updatedUsers });

    return updatedUsers;
  }

  updateRoomProperties(roomId: string, newValues: Partial<Room>) {
    const room = this.getRoomById(roomId);

    if (!room) return;

    const updatedRoom = { ...room, ...newValues };
    this.rooms = [...this.rooms.filter((r) => r.id !== roomId), updatedRoom];

    return updatedRoom;
  }

  removeUserFromRoom(roomId: string, userId: string) {
    const room = this.getRoomById(roomId);

    if (!room) return;

    const updatedUsers = room.users.filter((user) => user.id !== userId);

    const updatedRoom = this.updateRoomProperties(room.id, { users: updatedUsers });

    return updatedRoom;
  }

  removeUserFromRoomWhenDisconnected(userId: string): Room | undefined {
    const room = this.rooms.find((r) => r.users.some((user) => user.id === userId));

    if (!room) return;

    const updatedUsers = room.users.filter((user) => user.id !== userId);

    const updatedRoom = this.updateRoomProperties(room.id, { users: updatedUsers });

    return updatedRoom;
  }
}
