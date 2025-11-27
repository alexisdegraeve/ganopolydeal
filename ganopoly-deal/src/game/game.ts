import { Component } from '@angular/core';
import { DeckService } from '../app/services/deck';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent {
  // cards: Card[] = [];
  cards$: Observable<any[]>;

  shuffle = (array:any) => {
    return array.sort(() => Math.random() - 0.5);
}


  // private generateDeck(): Card[] {
  //   const deck = [];

  //   // 28 Cards owner
  //   for (let index = 0; index < 2; index++) {
  //     deck.push(new Card(DealType.property, null, DealColor.brown, 1, 1, 2));
  //    }

  //   deck.push(new Card(DealType.property, null, DealColor.brown, 1, 1, 2));
  //   deck.push(new Card(DealType.property, null, DealColor.lightBlue, 2, 2, 4));
  //   deck.push(new Card(DealType.notes, DealAction.rent, DealColor.lightBlue, 3, 0, 3));
  //   deck.push(new Card(DealType.notes, DealAction.doubleRent, 0, 0, 0));
  //   return deck;
  // }

  initializeCards() {
    // this.cards = this.shuffle(this.generateDeck());
    // this.cards = this.generateDeck();
    // console.log(this.cards);
  }


  newGame() {
        console.log('New Game');
    this.initializeCards();
  }

  constructor(private deckService: DeckService) {
    this.cards$ = this.deckService.getCards();
  }
}
