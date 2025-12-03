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
  lastCard$ =  new BehaviorSubject<Card | null>(null);

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

  drawLastCard(): Card | null {
    const deck = [...this.remainingDeck$.getValue()];
    const card = deck.pop() ?? null;
    this.remainingDeck$.next(deck);
    return card;
  }


  initializeCards() {
    // this.cards$ =
    this.deckService.getCards().pipe(
      map(cards => this.shuffle(cards))
    ).subscribe(shuffleCards => {
        // Distribute cards.
        const players: Player[] = [
        { id: 1, hand: shuffleCards.slice(0, 5), name: "Alice"},
        { id: 2, hand: shuffleCards.slice(5, 10), name: "Tom" },
        { id: 3, hand: shuffleCards.slice(10, 15), name: "John"}
      ];

      const  remainingDeck = shuffleCards.slice(15);
      this.players$.next(players);
      this.remainingDeck$.next(remainingDeck);
    })
  }


  newGame() {
       console.log('New Game');
      this.initializeCards();
  }

  constructor(private deckService: DeckService) {
   //  this.cards$ = this.deckService.getCards();
    this.remainingDeck$.subscribe(deck => {
        const last=deck.length ? deck[deck.length - 1] : null;
        this.lastCard$.next(last
      )});
  }
}
