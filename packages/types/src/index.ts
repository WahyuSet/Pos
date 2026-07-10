export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
  WAITER = 'WAITER',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  QRIS = 'QRIS',
  E_WALLET = 'E_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// WebSocket Event Names
export const WS_EVENTS = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  JOIN_RESTAURANT: 'join_restaurant',
};

// WebSocket Payload Interfaces
export interface WsOrderPayload {
  orderId: string;
  restaurantId: string;
  tableNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
}

// Shared API interfaces
export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  restaurantId: string;
  name: string;
}

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: Role;
  restaurantId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSession;
}
