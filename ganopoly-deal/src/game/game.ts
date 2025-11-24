import { Component } from '@angular/core';
import { Card, DealType, DealColor, DealAction } from '../models/card';

@Component({
  selector: 'app-game',
  imports: [],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent {
  cards: Card[] = [];

  private generateDeck(): Card[] {
    const deck = [];
    deck.push(new Card(DealType.property, null, DealColor.brown, 1, 1, 2));
    deck.push(new Card(DealType.property, null, DealColor.lightBlue, 2, 2, 4));
    deck.push(new Card(DealType.notes, DealAction.rent, DealColor.lightBlue, 3, 0, 3));
    deck.push(new Card(DealType.notes, DealAction.doubleRent, 0, 0, 0));
    return deck;
  }

  initializeCards() {
    this.cards = this.generateDeck();
  }


  newGame() {
    this.initializeCards();
    console.log('New Game');
    console.log(this.cards);
  }

  constructor() {

  }
}
