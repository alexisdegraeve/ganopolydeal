import { Component } from '@angular/core';
import { DeckService } from '../app/services/deck';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GanopolyCardComponent } from '../ganopoly-card/ganopoly-card';
import { ActionSet, Card, CardType, PropertySet } from '../models/card';
import { Player } from '../models/player';
import { HeaderComponent } from '../header/header';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-game',
  imports: [CommonModule, GanopolyCardComponent, RouterModule],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent {

  // cards$: Observable<Card[]> | undefined;
  players$ = new BehaviorSubject<Player[]>([]);
  remainingDeck$ = new BehaviorSubject<Card[]>([]);
  lastCard$ = new BehaviorSubject<Card | null>(null);
  actionDeck$ = new BehaviorSubject<Card[]>([]);
  totalCardsHuman$ = new BehaviorSubject<number>(0);
  selectedCards: Card[] = [];
  currentPlayerIndex = new BehaviorSubject<number>(0);
  startGame = false;
  lastActionCard$ = this.actionDeck$.pipe(map(deck => deck.at(-1) || null));
  alertMessage: string | null = null;



  showAlert(message: string, duration = 3000) {
    this.alertMessage = message;
    setTimeout(() => this.alertMessage = null, duration);
  }

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
      this.showAlert(`Player "${playerName}" not found`);
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
    players[players.length - 1].hand.pop();
    this.players$.next(players);
  }


  initializeCards() {
    // this.cards$ =
    this.deckService.getCards().pipe(
      map(cards => this.shuffle(cards))
    ).subscribe(shuffleCards => {
      // Distribute cards
      const players: Player[] = [
        { id: 1, hand: shuffleCards.slice(0, 5), name: "Alice", properties: [], money: [], actions: [], doubleRent: false },
        { id: 2, hand: shuffleCards.slice(5, 10), name: "Tom", properties: [], money: [], actions: [], doubleRent: false },
        { id: 3, hand: shuffleCards.slice(10, 15), name: "John", properties: [], money: [], actions: [], doubleRent: false },
        { id: 4, hand: shuffleCards.slice(15, 22), name: "Human", properties: [], money: [], actions: [], doubleRent: false } // + 2Cards
      ];


      const remainingDeck = shuffleCards.slice(22);
      this.players$.next(players);
      this.currentPlayerIndex.next(3);
      this.remainingDeck$.next(remainingDeck);

    })
  }


  newGame() {
    console.log('New Game');
    this.startGame = true;
    this.initializeCards();
  }

  constructor(private deckService: DeckService) {
    this.players$.subscribe(players => {
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
    if (player.hand.length > 5) {
      const moneyCards = player.hand.filter(c => c.type === 'money');
      moneyCards.forEach(card => this.moveCardToMoney(player, card));
    }
  }

  private playProperties(player: Player) {
    // Pour chaque carte propriété dans la main
    const propertiesInHand = player.hand.filter(c => c.type === 'property');
    propertiesInHand.forEach(card => {
      // Si carte complète un set ou commence un set vide, poser sur table
      if (this.canPlaceProperty(card)) {
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
      if (this.shouldPlayAction(card)) {
        this.playAction(player, card);
      }
    });
  }

  private drawCards(player: Player) {
    // Tirer 2 cartes si possible
    for (let i = 0; i < 2; i++) {
      const card = this.drawLastCard();
      if (card) player.hand.push(card);
    }
  }


  onCardSelectionChange(event: { card: Card, selected: boolean }) {
    console.log('onCardSelectionChange', event)
    if (event.selected) {
      if (!this.selectedCards.some(c => c.id === event.card.id)) {
        this.selectedCards.push(event.card);
      }
    } else {
      this.selectedCards = this.selectedCards.filter(
        c => c.id !== event.card.id
      );
    }
  }


  endturn() {
    console.log('Fin du tour de l\'humain');
    const players = [...this.players$.getValue()];

    // Find human player
    const human = players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return;


    console.log('CHECK ', this.selectedCards);
    // 1️⃣ Move selected cards into the proper piles
    for (const card of this.selectedCards) {

      switch (card.type) {

        case CardType.Property:
          human.properties.push(card);
          break;

        case CardType.Money:
          human.money.push(card);
          break;

        case CardType.Action:
          // You can either:
          // - place into a global discard pile
          // - or store actions played by human
          if (card.playAction) {
            // store
            // const actionDeck = this.actionDeck$.getValue();
            // actionDeck.push(card);
            // this.actionDeck$.next(actionDeck);
            this.applyAction(card, human, players);
          } else {
            human.money.push(card);
          }
          break;
      }
    }

    // 2️⃣ Remove selected cards from the human hand
    human.hand = human.hand.filter(
      c => !this.selectedCards.some(s => s.id === c.id)
    );

    // 3️⃣ Reset UI selections
    this.selectedCards = [];

    // Regarde le total de carte
    if (human.hand.length === 0) {
      // Plus de carte tu en rajouttes 5 pour l'humain
      this.takeCards(5, 'human');
    }

    // 4️⃣ Save updated players
    this.players$.next(players);

    // 5️⃣ Pass turn to next player (AI)
    //this.playNextAITurn();
    // Joueur suivant
    this.goToNextPlayer();
  }

  goToNextPlayer() {
    let index = this.currentPlayerIndex.getValue();

    // rotate to next
    index = (index + 1) % this.players$.getValue().length;
    this.currentPlayerIndex.next(index);

    const players = this.players$.getValue();
    const player = players[index];

    if (player.name.toLowerCase() !== 'human') {
      this.playTurn(player);
      this.goToNextPlayer(); // IA joue 100% automatiquement
    } else {
      this.takeCards(2, 'human');
      // this.startHumanTurn();
    }
  }

  stopGame() {
    this.startGame = false;
  }

  // startHumanTurn() {
  //   const players = this.players$.getValue();
  //   const human = players.find(p => p.name.toLowerCase() === 'human');
  //   if (!human) return;

  //   const cardsToDraw = Math.max(0, 2 - human.hand.length);
  //   if (cardsToDraw > 0) {
  //     this.takeCards(cardsToDraw, 'human');
  //   }

  //   this.players$.next(players); // update observable pour UI
  // }


  applyAction(card: Card, currentPlayer: Player, players: Player[]) {
    if (!card.playAction || !card.actionTargetId) return;

    // 1️⃣ Trouver le joueur ciblé
    const target = players.find(p => p.id === card.actionTargetId);
    if (!target) return;

    switch (card.setAction) {

      case ActionSet.DealBanco:
        // Exemple : voler une somme d'argent (ici on prend la 1ère carte Money)
        if (target.money.length > 0) {
          const stolen = target.money.shift()!;
          currentPlayer.money.push(stolen);
        }
        break;

      case ActionSet.DealSwap:
        // Exemple : échanger une propriété entre joueur et cible
        if (currentPlayer.properties.length > 0 && target.properties.length > 0) {
          const temp = currentPlayer.properties.pop()!;
          currentPlayer.properties.push(target.properties.pop()!);
          target.properties.push(temp);
        }
        break;

      case ActionSet.DealDuel:
        // Exemple : duel, le gagnant prend une carte aléatoire
        if (target.hand.length > 0) {
          const cardTaken = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
          currentPlayer.hand.push(cardTaken);
        }
        break;

      case ActionSet.Joker:
        // Exemple : Joker permet de changer la couleur d'une propriété
        // Ici tu pourrais demander à l'utilisateur quel setType il veut
        break;

      case ActionSet.DealJackpot:
        // Exemple : prendre 3 cartes Money de la pile générale
        const remainingDeck = this.remainingDeck$.getValue();
        for (let i = 0; i < 3 && remainingDeck.length > 0; i++) {
          currentPlayer.money.push(remainingDeck.shift()!);
        }
        this.remainingDeck$.next(remainingDeck);
        break;

      case ActionSet.Birthday:
        // Chaque autre joueur donne 1 Money
        players
          .filter(p => p.id !== currentPlayer.id)
          .forEach(p => {
            if (p.money.length > 0) {
              currentPlayer.money.push(p.money.shift()!);
            }
          });
        break;


      case ActionSet.Rent:
        if (!card.rentColor) {
          const defaultColor = this.getDefaultRentColor(currentPlayer, card) ?? undefined;
          card.rentColor = defaultColor;
          if (!card.rentColor) {
            this.showAlert('Rent color not selected');
            break;
          }
        }

        // On filtre les propriétés du joueur ciblé correspondant à la couleur demandée
        const targetProps = target.properties.filter(p => p.setType === card.rentColor);

        if (targetProps.length === 0) {
          this.showAlert(`Target player ${target.name} has no property of color ${card.rentColor}. Rent lost.`);
          // La carte va quand même dans la pile d'actions
        } else {
          // Exemple simple : on prend de l'argent équivalent à 1 carte Money par propriété de cette couleur
          const amountDue = targetProps.length;
          for (let i = 0; i < amountDue; i++) {
            if (target.money.length > 0) {
              const payment = target.money.shift()!;
              currentPlayer.money.push(payment);
            } else {
              this.showAlert(`${target.name} n'a plus d'argent à donner !`);
              // console.log(`${target.name} n'a plus d'argent à donner`);
            }
          }
        }

        // Stocker la carte dans la pile d'actions
        const actionDeck = this.actionDeck$.getValue();
        actionDeck.push(card);
        this.actionDeck$.next(actionDeck);

        break;

      case ActionSet.DoubleRent:
        // Ici tu pourrais appliquer un bonus pour le prochain Rent joué
        currentPlayer.doubleRent = true;
        break;



        case ActionSet.House:
        case ActionSet.Hotel:
          if (!card.targetSeries) {
            this.showAlert('Please choose a property series before playing this card');
            return;
          }

          // Trouver les propriétés du joueur dans la série choisie
          const selectedProps = currentPlayer.properties.filter(
            pr => pr.setType === card.targetSeries
          );

          // On ajoute simplement la carte House/Hotel dans cette série
          currentPlayer.properties.push(card);
          break;


      case ActionSet.PassGo:
        this.takeCards(2, currentPlayer.name);
        break;

      default:
        console.warn('Action non implémentée', card.setAction);
    }
  }

  canPlayActionCard(player: Player, card: Card): boolean {
    if (!player) return false;

    // Carte Rent
    if (card.setAction === ActionSet.Rent) {
      const rentColors: PropertySet[] = card.sets || [];
      const hasProperty = rentColors.some(color =>
        player.properties.some(p => p.setType === color || p.setType2 === color)
      );
      return hasProperty;
    }

    // Carte PassGo : désactiver si main pleine
    if (card.setAction === ActionSet.PassGo) {
      return player.hand.length < 5;
    }

    // Autres cartes Action jouables par défaut
    return true;
  }


  getDefaultRentColor(player: Player, card: Card): PropertySet | null {
    if (card.setAction !== ActionSet.Rent) return null;

    const rentColors: PropertySet[] = card.sets || [];
    const availableColors = rentColors.filter(color =>
      player.properties.some(p => p.setType === color || p.setType2 === color)
    );

    return availableColors.length === 1 ? availableColors[0] : null;
  }

    isEndTurnDisabled(human: Player): boolean {
      // const players = this.players$.getValue();
      // const human = players.find(p => p.name.toLowerCase() === 'human');
      // console.log('isEndTurnDisabled ', human);
      if (!human) return true;

      // 1️⃣ Limite de cartes sélectionnées
      if (this.selectedCards.length > 3) return true;

      // 2️⃣ Limite de main après avoir joué
      if ((human.hand.length - this.selectedCards.length) > 7) return true;

      return false;
  }



}
