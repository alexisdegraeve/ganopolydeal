import { Card } from "./card";

export interface Player {
  id: number;
  hand: Card[];
  name: string;
}
