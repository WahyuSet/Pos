import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS, WsOrderPayload } from '@repo/types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_RESTAURANT)
  handleJoinRestaurant(
    @MessageBody() restaurantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(restaurantId);
    console.log(`Client ${client.id} joined room (restaurant): ${restaurantId}`);
    return { event: WS_EVENTS.JOIN_RESTAURANT, status: 'joined' };
  }

  broadcastOrderUpdate(restaurantId: string, event: string, payload: WsOrderPayload) {
    if (this.server) {
      this.server.to(restaurantId).emit(event, payload);
      console.log(`Broadcasted event ${event} to restaurant ${restaurantId}`);
    }
  }
}
