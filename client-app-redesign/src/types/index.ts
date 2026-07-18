import { User, RegisterPayload } from './api';

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = User;

export type RegisterRequest = RegisterPayload;

export * from './api';
export * from './orders';


