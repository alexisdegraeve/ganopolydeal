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
  selectedCards: Card[] = [];


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
        { id: 1, hand: shuffleCards.slice(0, 5), name: "Alice", properties: [], money:[], actions: []},
        { id: 2, hand: shuffleCards.slice(5, 10), name: "Tom", properties: [], money:[], actions: [] },
        { id: 3, hand: shuffleCards.slice(10, 15), name: "John", properties: [], money:[], actions: [] },
        { id: 4, hand: shuffleCards.slice(15, 20) , name: "Human", properties: [], money:[], actions: [] }
      ];


      const remainingDeck = shuffleCards.slice(20);
      this.players$.next(players);
      this.remainingDeck$.next(remainingDeck);

    })
  }


  newGame() {
    console.log('New Game');
    this.initializeCards();
  }

  constructor(private deckService: DeckService) {
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

  protected playTurn(player: Player) {
    // 1. Poser les propriétés pour compléter les sets
    this.playProperties(player);

    // 2. Poser des billets si main trop pleine
    this.playMoneyIfHandFull(player);

    // 3. Jouer les actions offensives intelligemment
    this.playActions(player);

    // 4. Fin de tour : tirer 2 cartes si possible
    this.drawCards(player);
  }

    private playMoneyIfHandFull(player: Player) {
    // Si main > 5 cartes, poser les billets pour se protéger
    if(player.hand.length > 5) {
      const moneyCards = player.hand.filter(c => c.type === 'money');
      moneyCards.forEach(card => this.moveCardToMoney(player, card));
    }
  }

  private playProperties(player: Player) {
    // Pour chaque carte propriété dans la main
    const propertiesInHand = player.hand.filter(c => c.type === 'property');
    propertiesInHand.forEach(card => {
      // Si carte complète un set ou commence un set vide, poser sur table
      if(this.canPlaceProperty(card)) {
        this.moveCardToProperties(player, card);
      }
    });
  }

    private canPlaceProperty(card: Card): boolean {
    // Vérifie si le set est vide ou si ça complète un set existant
    return true; // Logique simple pour IA moyenne
  }

  private moveCardToProperties(player: Player, card: Card) {
    player.hand = player.hand.filter(c => c !== card);
    player.properties.push(card);
  }

  private moveCardToMoney(player: Player, card: Card) {
    player.hand = player.hand.filter(c => c !== card);
    player.money.push(card);
  }


  private playAction(player: Player, card: Card) {
    player.hand = player.hand.filter(c => c !== card);
    player.actions.push(card);
  }

  private shouldPlayAction(card: Card): boolean {
    // IA moyenne : jouer action seulement si gain immédiat
    return true; // Exemple simple
  }

  private playActions(player: Player) {
    // Priorité : actions qui permettent de voler une propriété ou doubler le loyer
    const actionCards = player.hand.filter(c => c.type === 'action');
    actionCards.forEach(card => {
      if(this.shouldPlayAction(card)) {
        this.playAction(player, card);
      }
    });
  }

  private drawCards(player: Player) {
    // Tirer 2 cartes si possible
    for(let i = 0; i < 2; i++) {
      const card = this.drawLastCard();
      if(card) player.hand.push(card);
    }
  }


  onCardSelectionChange(event: {card: Card, selected: boolean}) {
    console.log('onCardSelectionChange' , event)
     if (event.selected) {
          this.selectedCards.push(event.card);
      } else {
          this.selectedCards = this.selectedCards.filter(c => c.id !== event.card.id);
      }
  }

  endturn() {
    console.log('Fin du tour de l\'humain');
  }

}
