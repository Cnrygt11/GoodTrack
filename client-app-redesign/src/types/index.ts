import { User, RegisterPayload, Product } from '../services/apiClient';

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = User;

export type RegisterRequest = RegisterPayload;

export type { Product };

export * from './orders';


