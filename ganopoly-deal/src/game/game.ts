import { Component } from '@angular/core';
import { DeckService } from '../app/services/deck';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GanopolyCardComponent } from '../ganopoly-card/ganopoly-card';
import { Card } from '../models/card';
import { Player } from '../models/player';

@Component({
  selector: 'app-game',
  imports: [CommonModule, GanopolyCardComponent],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent {

  // cards$: Observable<Card[]> | undefined;
  players$ = new BehaviorSubject<Player[]>([]);
  remainingDeck$ = new BehaviorSubject<Card[]>([]);
  lastCard$ = new BehaviorSubject<Card | null>(null);
  totalCardsHuman$ = new BehaviorSubject<number>(0);

  // Fisher-Yates algorithm
  shuffle<T>(array: T[]): T[] {
    const arr = [...array]; // copie
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  last(): Card | null {
    const deck = this.remainingDeck$.getValue();
    return deck.length > 0 ? deck[deck.length - 1] : null;
  }

  // totalCardsHuman() {
  //   const players = this.players$.getValue();
  //   const total = players[players.length - 1].hand.length;
  //   this.totalCardsHuman$.next(total);
  // }


  take2Cards() {
    const oneCard = this.drawLastCard();
    const secondCard = this.drawLastCard();
    const players = this.players$.getValue();
    const hand = players[players.length - 1].hand;
    if (oneCard) hand.push(oneCard);
    if (secondCard) hand.push(secondCard);
    this.players$.next(players);
  }

  takeCards(count: number, playerName: string): void {
    const players = [...this.players$.getValue()];

    // Find player by name
    const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (!player) {
      console.warn(`Player "${playerName}" not found`);
      return;
    }

    // Draw 'count' cards
    for (let i = 0; i < count; i++) {
      const card = this.drawLastCard();
      if (card) {
        player.hand.push(card);
      }
    }

    // Push updated list
    this.players$.next(players);
  }

  drawLastCard(): Card | null {
    const deck = [...this.remainingDeck$.getValue()];
    const card = deck.pop() ?? null;
    this.remainingDeck$.next(deck);
    return card;
  }

  remove() {
    const players = this.players$.getValue();
    players[players.length-1].hand.pop();
    this.players$.next(players);
  }


  initializeCards() {
    // this.cards$ =
    this.deckService.getCards().pipe(
      map(cards => this.shuffle(cards))
    ).subscribe(shuffleCards => {
      // Distribute cards
      const players: Player[] = [
        { id: 1, hand: shuffleCards.slice(0, 5), name: "Alice" },
        { id: 2, hand: shuffleCards.slice(5, 10), name: "Tom" },
        { id: 3, hand: shuffleCards.slice(10, 15), name: "John" },
        { id: 4, hand: shuffleCards.slice(15, 20) , name: "Human" }
      ];


      const remainingDeck = shuffleCards.slice(20);
      this.players$.next(players);
      this.remainingDeck$.next(remainingDeck);

      //       const human = players.find(p => p.name.toLowerCase() === 'human');
      // const total = human ? human.hand.length : 0;
      // console.log('check ', total);
      // this.totalCardsHuman$.next(total);
    })
  }


  newGame() {
    console.log('New Game');
    this.initializeCards();
  }

  constructor(private deckService: DeckService) {
    //  this.cards$ = this.deckService.getCards();
    this.players$.subscribe( players => {
      console.log('je suis ici ', players);
      const human = players.find(p => p.name.toLowerCase() === 'human');
      const total = human ? human.hand.length : 0;
      console.log('je suis ici ', total);
      this.totalCardsHuman$.next(total);
    })

    this.remainingDeck$.subscribe(deck => {
      const last = deck.length ? deck[deck.length - 1] : null;
      this.lastCard$.next(last
      )
    });
  }
}
