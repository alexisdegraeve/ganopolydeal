import { Component, OnDestroy } from '@angular/core';
import { DeckService } from '../app/services/deck';
import { BehaviorSubject, map, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GanopolyCardComponent } from '../ganopoly-card/ganopoly-card';
import { ActionSet, Card, CardType, MoneyGroup, PropertyGroup, PropertySet } from '../models/card';
import { Player } from '../models/player';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-game',
  imports: [CommonModule, GanopolyCardComponent, RouterModule],
  templateUrl: './game.html',
  styleUrls: ['./game.scss'],
})
export class GameComponent implements OnDestroy {

  // cards$: Observable<Card[]> | undefined;
  players$ = new BehaviorSubject<Player[]>([]);
  remainingDeck$ = new BehaviorSubject<Card[]>([]);
  lastCard$ = new BehaviorSubject<Card | null>(null);
  actionDeck$ = new BehaviorSubject<Card[]>([]);
  totalCardsHuman$ = new BehaviorSubject<number>(0);
  selectedCards$ = new BehaviorSubject<Card[]>([]);
  currentPlayerIndex = new BehaviorSubject<number>(0);
  startGame = false;
  lastActionCard$ = this.actionDeck$.pipe(map(deck => deck.at(-1) || null));
  alertMessage: string | null = null;
  gameOverReason: 'win' | 'draw' | null = null;
  winner: Player | null = null;
  iaMessages$ = new BehaviorSubject<Record<number, string>>({});
  private subscriptions: Subscription[] = [];


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
        // { id: 2, hand: shuffleCards.slice(5, 10), name: "Tom", properties: [], money: [], actions: [], doubleRent: false },
        { id: 2, hand: shuffleCards.slice(5, 10), name: "John", properties: [], money: [], actions: [], doubleRent: false },
        { id: 3, hand: shuffleCards.slice(10, 17), name: "Human", properties: [], money: [], actions: [], doubleRent: false } // + 2Cards
      ];


      const remainingDeck = shuffleCards.slice(17);
      this.players$.next(players);
      this.currentPlayerIndex.next(2);
      this.remainingDeck$.next(remainingDeck);

    })
  }


  newGame() {
    this.startGame = true;
    this.winner = null;
    this.gameOverReason = null;

    this.players$.next([]);
    this.remainingDeck$.next([]);
    this.actionDeck$.next([]);
    this.selectedCards$.next([]);
    this.initializeCards();
  }

  constructor(private deckService: DeckService) {
    this.subscriptions.push(
      this.players$.subscribe(players => {
        const human = players.find(p => p.name.toLowerCase() === 'human');
        const total = human ? human.hand.length : 0;
        this.totalCardsHuman$.next(total);
      }),
      this.remainingDeck$.subscribe(deck => {
        const last = deck.length ? deck[deck.length - 1] : null;
        this.lastCard$.next(last
        )
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  protected playTurn(player: Player) {
    // 1. Poser les propriétés pour compléter les sets

    this.aiStoreMoney(player);
    this.playProperties(player);

    // Property Joker
    this.playPropertiesJoker(player);

    // 2. Poser des billets si main trop pleine
    this.limitAIHand(player);

    // 3. Jouer les actions offensives intelligemment
    this.playActions(player);

    // 4. Fin de tour : tirer 2 cartes si possible
    this.drawCards(player);

  }

  private aiStoreMoney(player: Player) {
    const moneyCards = player.hand.filter(c => c.type === CardType.Money);

    // Toujours garder au moins 1 carte en main pour bluff / défense
    const MAX_KEEP = 1;

    while (player.hand.filter(c => c.type === CardType.Money).length > MAX_KEEP) {
      const card = player.hand.find(c => c.type === CardType.Money)!;
      this.moveCardToMoney(player, card);
    }
  }

  private limitAIHand(player: Player) {
    const MAX_HAND = 7;
    while (player.hand.length > MAX_HAND) {
      // On pose automatiquement des billets si possible
      const moneyCard = player.hand.find(c => c.type === CardType.Money);
      if (moneyCard) {
        this.moveCardToMoney(player, moneyCard);
      } else {
        // Si pas de Money, poser une propriété aléatoire ou action perdue dans la pile d'actions
        const card = player.hand.pop()!;
        if (card.type === CardType.Property || card.type === CardType.PropertyJoker) {
          player.properties.push(card);
        } else {
          const actionDeck = this.actionDeck$.getValue();
          actionDeck.push(card);
          this.actionDeck$.next(actionDeck);
        }
      }
    }
  }


  private playPropertiesJoker(player: Player) {
    const jokers = player.hand.filter(c => c.type === CardType.PropertyJoker);
    jokers.forEach(card => {
      card.jokerColor = this.chooseJokerColorForAI(player, card);
      this.moveCardToProperties(player, card);
    });
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


  private getRealPropertyColors(cards: Card[]): PropertySet[] {
  const colors = new Set<PropertySet>();

  for (const c of cards) {
    if (c.type === CardType.Property) {
      if (c.setType) colors.add(c.setType);
    }

    if (c.type === CardType.PropertyJoker && c.jokerColor && c.jokerColor !== PropertySet.Multi) {
      colors.add(c.jokerColor);
    }
  }

  return Array.from(colors);
}

  private chooseJokerColorForAI(player: Player, card: Card): PropertySet {
    const ownedColors = this.getRealPropertyColors(player.properties);

      // Joker MULTI → toutes tes couleurs
      if (card.setType === PropertySet.Multi) {
        return ownedColors[Math.floor(Math.random() * ownedColors.length)];
      }

      // Joker bi-couleur
      const allowed = [card.setType, card.setType2].filter(c => ownedColors.includes(c as PropertySet)) as PropertySet[];
      return allowed[0];
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

  private shouldPlayAction(card: Card, player: Player, players: Player[]): boolean {
    if (this.getCompletedSets(player) >= 2) return true;

    if (card.setAction === ActionSet.Rent)
      return players.some(p => p.id !== player.id && p.money.length > 0);

    if (card.setAction && [ActionSet.DealDuel, ActionSet.DealSwap, ActionSet.DealBanco]
      .includes(card.setAction))
      return players.some(p => this.getCompletedSets(p) >= 1);

    if (card.setAction === ActionSet.Birthday)
      return players.some(p => p.id !== player.id && p.money.length > 0);

    if (card.setAction && [ActionSet.House, ActionSet.Hotel].includes(card.setAction))
      return this.canPlayHouseOrHotel(player, card);

    return false;
  }

  private playActions(player: Player) {
    const players = [...this.players$.getValue()];
    const actionCards = player.hand.filter(c => c.type === CardType.Action);

    actionCards.forEach(card => {
      if (this.shouldPlayAction(card, player, players)) {

        // Message UI pour l’IA
        if (player.name.toLowerCase() !== 'human') {
          this.showIAMessage(player, `Playing action: ${card.setAction}`);
        }

        // Jouer l’action
        if (card.setAction === ActionSet.Joker) {
          card.playAction = true;
          this.playJokerAction(card, player, players);
        } else {
          this.applyAction(card, player, players);
        }

        // Retirer la carte de la main
        player.hand = player.hand.filter(c => c !== card);

        // Mettre à jour l’observable
        this.players$.next(players);
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
    const current = this.selectedCards$.getValue();
    let updated: Card[];
    if (event.selected) {
      // Ajouter si pas déjà présent
      updated = current.some(c => c.id === event.card.id)
        ? current
        : [...current, event.card];
    } else {
      // Retirer la carte
      updated = current.filter(c => c.id !== event.card.id);
    }

    this.selectedCards$.next(updated);
  }


  endturn() {
    const players = [...this.players$.getValue()];

    // Find human player
    const human = players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return;

    // 1️⃣ Move selected cards into the proper piles
    for (const card of this.selectedCards$.value) {

      switch (card.type) {

        case CardType.Property:
          human.properties.push(card);
          break;

        case CardType.PropertyJoker:
          if (!card.jokerColor) {
            this.showAlert('Please choose a color for the Joker before playing it');
            continue; // ne pas poser la carte tant que couleur non choisie
          }

          human.properties.push(card);
          break;

        case CardType.Money:
          human.money.push(card);
          break;

        case CardType.Action:
          // You can either:
          // - place into a global discard pile
          // - or store actions played by human

          if (card.setAction === ActionSet.Joker && card.playAction) {
            this.playJokerAction(card, human, players);
          } else if (card.playAction) {
            this.applyAction(card, human, players);
          } else {
            human.money.push(card);
          }
          break;
      }
    }

    // 2️⃣ Remove selected cards from the human hand
    human.hand = human.hand.filter(
      c =>
        !this.selectedCards$.getValue().some(s =>
          s.id === c.id &&
          !(s.type === CardType.PropertyJoker && !s.jokerColor)
        )
    );

    // 3️⃣ Reset UI selections
    this.selectedCards$.next([]);

    // Regarde le total de carte
    if (human.hand.length === 0) {
      // Plus de carte tu en rajouttes 5 pour l'humain
      this.takeCards(5, 'human');
    }

    // 4️⃣ Save updated players
    this.players$.next(players);

    // Vérifie victoire après tour humain
    if (this.checkWin()) return;

    // 5️⃣ Pass turn to next player (AI)
    setTimeout(() => this.goToNextPlayer(), 0);
  }

  private playJokerAction(card: Card, currentPlayer: Player, players: Player[]) {
    // 1️⃣ Vérifier s'il y a une action à annuler
    const lastActionCard = this.actionDeck$.getValue().at(-1);
    if (!lastActionCard || lastActionCard.setAction === ActionSet.Joker) {
      this.showAlert('No action to cancel.');
      return;
    }

    // 2️⃣ IA ou humain peut contrecarrer avec un autre Joker
    const targetPlayer = players.find(p => p.id === lastActionCard.actionTargetId) ?? currentPlayer;

    // 3️⃣ Retirer l'action ciblée de la pile
    let actionDeck = this.actionDeck$.getValue();
    actionDeck = actionDeck.filter(c => c !== lastActionCard);
    this.actionDeck$.next(actionDeck);

    this.showAlert(`${currentPlayer.name} cancelled the action of ${targetPlayer.name}!`);

    // 4️⃣ Ajouter le Joker à la pile d'actions (si besoin pour historique)
    actionDeck.push(card);
    this.actionDeck$.next(actionDeck);
  }


  goToNextPlayer() {
    let index = this.currentPlayerIndex.getValue();

    // joueur suivant
    index = (index + 1) % this.players$.getValue().length;
    this.currentPlayerIndex.next(index);

    const players = this.players$.getValue();
    const player = players[index];

    if (player.name.toLowerCase() !== 'human') {
      this.playTurn(player);
    } else {
      this.takeCards(2, 'human');
      this.selectedCards$.next([]);
      return; // on s'arrête ici : attente interaction humaine
    }

    // 🔚 FIN DE TOUR → on vérifie l’état du jeu UNE FOIS
    if (this.checkWin()) {
      this.gameOverReason = 'win';
      this.startGame = false;
      return;
    }

    if (this.checkDraw()) {
      this.gameOverReason = 'draw';
      this.startGame = false;
      return;
    }

    // sinon, on continue automatiquement
    setTimeout(() => this.goToNextPlayer(), 0);
  }

  stopGame() {
    this.startGame = false;
  }

  getStealableFullSets(player: Player) {
    const sets: Record<PropertySet, Card[]> = {} as any;
    for (const p of player.properties) {
      if (!p.setType) continue;
      const c = p.setType as PropertySet;
      if (!sets[c]) sets[c] = [];
      sets[c].push(p);
    }

    return Object.entries(sets)
      .filter(([color, cards]) => this.isSetComplete(color as PropertySet, cards))
      .map(([color, cards]) => ({ color, cards }));
  }



  applyAction(card: Card, currentPlayer: Player, players: Player[]) {
    if (!card.playAction || (!card.actionTargetId && card.setAction !== ActionSet.PassGo)) return;

    // 1️⃣ Trouver le joueur ciblé
    let target = players.find(p => p.id === card.actionTargetId);
    if (!target) {
      target = currentPlayer;
    }

    switch (card.setAction) {

      case ActionSet.DealBanco:
        // Exemple : voler une somme d'argent (ici on prend la 1ère carte Money)
        const stealableSets = this.getStealableFullSets(target);
        if (!stealableSets.length) break;

        const chosen = stealableSets[Math.floor(Math.random() * stealableSets.length)];

        target.properties = target.properties.filter(p => !chosen.cards.includes(p));
        currentPlayer.properties.push(...chosen.cards);
        break;

      case ActionSet.DealSwap:
        // Exemple : échanger une propriété entre joueur et cible
        const eligibleMine = this.getEligiblePropertiesForDuel(currentPlayer);
        const eligibleTarget = this.getEligiblePropertiesForDuel(target);

        if (eligibleMine.length && eligibleTarget.length) {
          const myProp = eligibleMine[Math.floor(Math.random() * eligibleMine.length)];
          const hisProp = eligibleTarget[Math.floor(Math.random() * eligibleTarget.length)];

          currentPlayer.properties = currentPlayer.properties.filter(p => p !== myProp);
          target.properties = target.properties.filter(p => p !== hisProp);

          currentPlayer.properties.push(hisProp);
          target.properties.push(myProp);
        } else {
          this.showAlert('No eligible properties to swap');
        }
        break;

      case ActionSet.DealDuel:
        this.playActionDealDuel(target, card, currentPlayer);
        // Exemple : duel, le gagnant prend une carte aléatoire
        break;

      case ActionSet.Joker:
        // Exemple : Joker permet de changer la couleur d'une propriété
        // Ici tu pourrais demander à l'utilisateur quel setType il veut
        break;

      case ActionSet.DealJackpot:
        // Déterminer le joueur cible
        let jackpotTarget: Player | undefined;

        // Si joueur humain, utiliser celui sélectionné
        if (currentPlayer.name.toLowerCase() === 'human') {
          jackpotTarget = players.find(p => p.id === card.actionTargetId);
          if (!jackpotTarget) {
            this.showAlert('Please select a target player for Deal Jackpot');
            break;
          }
        } else {
          // IA : choisir au hasard un autre joueur
          const otherPlayers = players.filter(p => p.id !== currentPlayer.id);
          jackpotTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        }

        // Montant du jackpot
        const jackpotValue = 5;
        let remaining = jackpotValue;

        // Payer en cartes Money
        while (remaining > 0 && jackpotTarget.money.length > 0) {
          const moneyCard = jackpotTarget.money.shift()!;
          currentPlayer.money.push(moneyCard);
          remaining -= moneyCard.value ?? 1;
        }

        if (remaining > 0) {
          this.showAlert(`${jackpotTarget.name} cannot fully pay the Jackpot!`);
          // Ici tu peux ajouter logique pour payer en propriétés si tu veux
        }

        break;


      case ActionSet.Birthday:
        // Chaque autre joueur donne 1 Money
        players
          .filter(p => p.id !== currentPlayer.id)
          .forEach(p => {
            this.payBirthday(p, currentPlayer);
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

        // 💥 on compte TES cartes, pas les siennes
        const myProps = currentPlayer.properties.filter(
          p => p.setType === card.rentColor || p.jokerColor === card.rentColor
        );

        if (myProps.length === 0) {
          this.showAlert(`${currentPlayer.name} has no property of color ${card.rentColor}. Rent lost.`);
          break;
        }

        let amountDue = myProps.length;

        // Double rent
        if (currentPlayer.doubleRent) {
          amountDue *= 2;
          currentPlayer.doubleRent = false;
        }

        // Paiement
        for (let i = 0; i < amountDue; i++) {
          if (target.money.length > 0) {
            const payment = target.money.shift()!;
            currentPlayer.money.push(payment);
          } else {
            this.forcePay(target, currentPlayer, amountDue);
            // this.showAlert(`${target.name} cannot fully pay rent!`);
            break;
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

        const eligibleColors = this.getEligibleSeriesForHouseOrHotel(currentPlayer, card);
        if (eligibleColors.length > 0) {
          card.targetSeries = eligibleColors[0]; // IA prend la première série valide
          currentPlayer.properties.push(card);
        }

        // Trouver les propriétés du joueur dans la série choisie
        // const selectedProps = currentPlayer.properties.filter(
        //   pr => pr.setType === card.targetSeries
        // );

        // On ajoute simplement la carte House/Hotel dans cette série
        currentPlayer.properties.push(card);
        break;


      case ActionSet.PassGo:
        this.takeCards(2, currentPlayer.name);
        break;

      default:
        console.warn('Action non implémentée', card.setAction);
    }

    if (currentPlayer.name.toLowerCase() !== 'human') {
      this.showIAMessage(currentPlayer, `${currentPlayer.name} applies ${card.setAction} on ${target.name}`);
    }
  }

  private forcePay(from: Player, to: Player, amount: number) {
    let remaining = amount;

    // 1️⃣ payer avec l'argent
    while (remaining > 0 && from.money.length > 0) {
      const card = from.money.shift()!;
      to.money.push(card);
      remaining -= card.value ?? 1;
    }

    // 2️⃣ payer avec propriétés (en commençant par les non-complets)
    while (remaining > 0 && from.properties.length > 0) {
      const stealable = this.getEligiblePropertiesForDuel(from);
      const prop = stealable.length
        ? stealable[Math.floor(Math.random() * stealable.length)]
        : from.properties[0];

      from.properties = from.properties.filter(p => p !== prop);
      to.properties.push(prop);
      remaining--;
    }

    // 3️⃣ mort
    if (remaining > 0) {
      this.killPlayer(from, to);
    }
  }


  private killPlayer(dead: Player, killer: Player) {
    killer.money.push(...dead.money);
    killer.properties.push(...dead.properties);
    dead.money = [];
    dead.properties = [];

    this.showAlert(`💀 ${dead.name} is BANKRUPT! All assets go to ${killer.name}`);
  }




  private payBirthday(from: Player, to: Player) {
    // Sécurité
    if (!from.money || from.money.length === 0) {
      this.showAlert(`${from.name} cannot pay for Birthday`);
      return;
    }

    // 1️⃣ Carte de valeur exactement 2
    const exactTwo = from.money.find(c => c.value === 2);
    if (exactTwo) {
      from.money = from.money.filter(c => c !== exactTwo);
      to.money.push(exactTwo);
      return;
    }

    // 2️⃣ Carte de valeur > 2
    const greaterThanTwo = from.money.find(c => (c.value ?? 0) > 2);
    if (greaterThanTwo) {
      from.money = from.money.filter(c => c !== greaterThanTwo);
      to.money.push(greaterThanTwo);
      return;
    }

    // 3️⃣ Deux cartes de valeur 1
    const ones = from.money.filter(c => c.value === 1);
    if (ones.length >= 2) {
      const paid = ones.slice(0, 2);
      from.money = from.money.filter(c => !paid.includes(c));
      to.money.push(...paid);
      return;
    }

    // 4️⃣ Impossible de payer
    this.showAlert(`${from.name} cannot fully pay for Birthday`);
  }


  playActionDealDuel(target: Player | undefined, card: Card, currentPlayer: Player) {
    if (!target) return;

    let propertyToTake: Card | undefined;

    if (card.duelTargetPropId) {
      // Humain a choisi
      propertyToTake = target.properties.find(p => p.id === card.duelTargetPropId);
    } else {
      // IA : pick random eligible property
      const eligible = this.getEligiblePropertiesForDuel(target);
      if (eligible.length > 0) {
        propertyToTake = eligible[Math.floor(Math.random() * eligible.length)];
      }
    }

    if (!propertyToTake) {
      this.showAlert(`${target.name} has no eligible property to steal`);
      return;
    }

    // Retirer du joueur cible et ajouter à l'actuel
    target.properties = target.properties.filter(p => p.id !== propertyToTake!.id);
    currentPlayer.properties.push(propertyToTake);

    // Ajouter la carte DealDuel à la pile d'actions
    const actionDeck = this.actionDeck$.getValue();
    actionDeck.push(card);
    this.actionDeck$.next(actionDeck);

    return;

  }




  getDefaultRentColor(player: Player, card: Card): PropertySet | null {
    if (card.setAction !== ActionSet.Rent) return null;

    const rentColors: PropertySet[] = [card.setType, card.setType2].filter(Boolean) as PropertySet[];
    const availableColors = rentColors.filter(color =>
      player.properties.some(p => p.setType === color || p.setType2 === color)
    );

    return availableColors.length === 1 ? availableColors[0] : null;
  }

  isEndTurnDisabled(human: Player): boolean {
    let selectedCards = this.selectedCards$.getValue();
    if (!human) return true;

    // 1️⃣ Limite de cartes sélectionnées
    if (selectedCards.length > 3) return true;

    // 2️⃣ Limite de main après avoir joué
    if ((human.hand.length - selectedCards.length) > 7) return true;

    return false;
  }


  getEligiblePropertiesForDuel(targetPlayer: Player): Card[] {
    if (!targetPlayer) return [];

    const sets: Record<PropertySet, Card[]> = {} as any;
    for (const prop of targetPlayer.properties) {
      if (!prop.setType) continue;
      const color = prop.setType as PropertySet;
      if (!sets[color]) sets[color] = [];
      sets[color].push(prop);
    }

    const requiredByColor: Partial<Record<PropertySet, number>> = {
      [PropertySet.Brown]: 2,
      [PropertySet.DarkBlue]: 2
    };

    const eligible: Card[] = [];
    for (const [colorKey, cards] of Object.entries(sets)) {
      const color = colorKey as PropertySet;
      const needed = requiredByColor[color] ?? 3;
      if (cards.length < needed) {
        eligible.push(...cards);
      }
    }

    return eligible;
  }


  canPlayHouseOrHotel(player: Player, card: Card): boolean {
    if (!card) return false;
    if (card.setAction !== ActionSet.House && card.setAction !== ActionSet.Hotel) return false;

    // On ne peut pas jouer sur gares ou services publics
    const eligibleProps = player.properties.filter(p =>
      p.setType !== PropertySet.Railroad &&
      p.setType !== PropertySet.UtilityElec &&
      p.setType !== PropertySet.UtilityWater
    );

    // On groupe par couleur
    const sets: Record<PropertySet, Card[]> = {} as any;
    for (const prop of eligibleProps) {
      if (!prop.setType) continue;
      const color = prop.setType as PropertySet;
      if (!sets[color]) sets[color] = [];
      sets[color].push(prop);
    }

    for (const [colorKey, cards] of Object.entries(sets)) {
      const color = colorKey as PropertySet;

      // House : on peut ajouter si pas déjà de House
      if (card.setAction === ActionSet.House) {
        const hasHouse = cards.some(c => c.setAction === ActionSet.House);
        const fullSet = this.isSetComplete(color, cards);
        if (fullSet && !hasHouse) return true;
      }

      // Hotel : on peut ajouter si House déjà posée et pas déjà d'Hotel
      if (card.setAction === ActionSet.Hotel) {
        const hasHouse = cards.some(c => c.setAction === ActionSet.House);
        const hasHotel = cards.some(c => c.setAction === ActionSet.Hotel);
        const fullSet = this.isSetComplete(color, cards);
        if (fullSet && hasHouse && !hasHotel) return true;
      }
    }

    return false;
  }

  private isSetComplete(color: PropertySet, cards: Card[]): boolean {
    const requiredByColor: Partial<Record<PropertySet, number>> = {
      [PropertySet.Brown]: 2,
      [PropertySet.DarkBlue]: 2
    };
    const needed = requiredByColor[color] ?? 3;
    return cards.filter(c => c.type === CardType.Property).length >= needed;
  }

  getEligibleSeriesForHouseOrHotel(player: Player, card: Card): PropertySet[] {
    const eligible: PropertySet[] = [];
    const sets: Record<PropertySet, Card[]> = {} as any;

    for (const prop of player.properties) {
      if (!prop.setType) continue;
      const color = prop.setType as PropertySet;
      if (!sets[color]) sets[color] = [];
      sets[color].push(prop);
    }

    for (const [colorKey, cards] of Object.entries(sets)) {
      const color = colorKey as PropertySet;
      const hasHouse = cards.some(c => c.setAction === ActionSet.House);
      const hasHotel = cards.some(c => c.setAction === ActionSet.Hotel);
      const fullSet = this.isSetComplete(color, cards);

      if (card.setAction === ActionSet.House && fullSet && !hasHouse) eligible.push(color);
      if (card.setAction === ActionSet.Hotel && fullSet && hasHouse && !hasHotel) eligible.push(color);
    }

    return eligible;
  }


  private checkWin(): boolean {
    const players = this.players$.getValue();
    for (const player of players) {
      const completedSets = this.getCompletedSets(player);
      if (completedSets >= 3) {
        this.winner = player;
        this.gameOverReason = 'win';
        this.startGame = false;
        return true;
      }
    }
    return false;
  }




  private getCompletedSets(player: Player): number {
    const sets: Record<PropertySet, Card[]> = {} as any;
    for (const prop of player.properties) {
      if (!prop.setType) continue;
      const color = prop.setType as PropertySet;
      if (!sets[color]) sets[color] = [];
      sets[color].push(prop);
    }

    let count = 0;
    for (const [colorKey, cards] of Object.entries(sets)) {
      const color = colorKey as PropertySet;
      if (this.isSetComplete(color, cards)) count++;
    }
    return count;
  }

  checkDraw(): boolean {
    const deckEmpty = this.remainingDeck$.getValue().length === 0;
    return deckEmpty && !this.winner;
  }

  showIAMessage(player: Player, message: string, duration = 3000) {
    const current = { ...this.iaMessages$.getValue() };
    current[player.id] = message;
    this.iaMessages$.next(current);

    // Supprimer le message après un certain temps
    setTimeout(() => {
      const updated = { ...this.iaMessages$.getValue() };
      delete updated[player.id];
      this.iaMessages$.next(updated);
    }, duration);
  }

  groupProperties(player: Player): PropertyGroup[] {
    const groups: Record<PropertySet, Card[]> = {} as any;

    for (const card of player.properties) {
      const color = card.type === CardType.PropertyJoker
        ? (card.jokerColor ?? card.setType)  // joker doit avoir une couleur valide
        : card.setType;

      if (!color) continue;

      if (!groups[color]) groups[color] = [];
      groups[color].push(card);
    }

    return Object.entries(groups).map(([color, cards]) => ({
      color: color as PropertySet,
      cards
    }));
  }

  isGroupComplete(group: PropertyGroup): boolean {
    const needed = group.cards[0]?.setSize;
    return needed ? group.cards.length >= needed : false;
  }

  groupMoney(player: Player): MoneyGroup[] {
    const groups: Record<number, Card[]> = {};

    for (const card of player.money) {
      const v = card.value ?? 1;
      if (!groups[v]) groups[v] = [];
      groups[v].push(card);
    }

    return Object.entries(groups).map(([value, cards]) => ({
      value: Number(value),
      cards
    }));
  }

}
