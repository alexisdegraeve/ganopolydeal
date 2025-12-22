import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Card, CardType, PropertySet, ActionSet } from '../models/card';
import { CommonModule } from '@angular/common';
import { Player } from '../models/player';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'ganopoly-card',
  imports: [CommonModule,],
  templateUrl: './ganopoly-card.html',
  styleUrl: './ganopoly-card.scss',
})
export class GanopolyCardComponent implements OnInit {
  @Input() card?: Card;
  @Output() selectionChange = new EventEmitter<{ card: Card, selected: boolean }>();
  @Output() actionCardChange = new EventEmitter<{ card: Card, playAction: boolean }>();
  @Output() jokerColorSelected = new EventEmitter<{ card: Card, color: PropertySet }>();
  @Input() showFront = true;
  selected = false;
  CardType = CardType;
  PropertySet = PropertySet;
  ActionSet = ActionSet;
  @Input() readOnly = true;
  @Input() clickable = true;
  @Input() players: Player[] = [];
  @Input() selectedCards$!: BehaviorSubject<Card[]>;

  ngOnInit() {
    if (!this.card || !this.selectedCards$) return;
    this.selectedCards$.subscribe(cards => {
      this.selected = cards.some(c => c.id === this.card!.id);
    });
  }

  toggleCard() {
    this.showFront = !this.showFront;
  }

  toggleSelected() {
    this.selected = !this.selected;
    if (this.card) this.selectionChange.emit({ card: this.card, selected: this.selected });
  }

  onJokerColorSelected(color: PropertySet) {
    if (!this.card) return;

    this.card.setType = color;  // On stocke la couleur choisie
    this.jokerColorSelected.emit({ card: this.card, color });
    // On peut aussi considérer la carte comme sélectionnée
    this.selected = true;
    this.selectionChange.emit({ card: this.card, selected: true });
  }


  onCardStateChange(state: 'not-picked' | 'money' | 'action') {
    if (!this.card) return;

    if (state === 'not-picked') {
      this.selected = false;   // non jouée
    } else {
      this.selected = true;    // jouée
      this.card.playAction = (state === 'action'); // true si action, false si money
    }

    // Émettre au parent
    this.selectionChange.emit({ card: this.card, selected: this.selected });
  }

  onPickStateChange(take: boolean) {
    this.selected = take;

    if (this.card) {
      this.selected = take;   // synchronise l’état avec l’objet carte
      this.selectionChange.emit({ card: this.card, selected: take });
    }
  }
  onTargetSelected(playerId: number) {
    if (!this.card) return;

    this.card.actionTargetId = playerId;

    this.selectionChange.emit({
      card: this.card,
      selected: this.selected
    });
  }

  onRentColorSelected(color: PropertySet) {
    if (!this.card) return;
    this.card.rentColor = color;
    this.selectionChange.emit({ card: this.card, selected: true });
  }

  getRentColors(card: Card): PropertySet[] {
    const human = this.getHuman();
    if (!human) return [];

    const possibleColors = [card.setType, card.setType2]
      .filter(Boolean) as PropertySet[];

    return possibleColors.filter(color =>
      human.properties.some(p =>
        p.setType === color || p.setType2 === color
      )
    );
  }

  getEligibleSeries(card: Card): { color: PropertySet, cards: Card[] }[] {
    const human = this.players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return [];

    if (!card || (card.setAction !== ActionSet.House && card.setAction !== ActionSet.Hotel)) {
      return [];
    }

    // Groupe par couleur
    const sets: Record<PropertySet, Card[]> = {} as any;

    for (const prop of human.properties) {
      if (prop.setType) {
        const color = prop.setType as PropertySet;
        if (!sets[color]) sets[color] = [];
        sets[color].push(prop);
      }
    }

    // Règles Monopoly Deal :
    const requiredByColor: Record<PropertySet, number> = {
      [PropertySet.Brown]: 2,
      [PropertySet.DarkBlue]: 2,

      // les autres couleurs non définies ici seront à 3
    } as any;

    // Filtrer les couleurs jouables (série complète)
    return Object.entries(sets)
      .filter(([colorKey, cards]) => {
        const color = colorKey as PropertySet;
        const needed = requiredByColor[color] ?? 3;

        const realProps = cards.filter(c => c.type === CardType.Property);

        return realProps.length >= needed;
      })
      .map(([colorKey, cards]) => ({
        color: colorKey as PropertySet,
        cards
      }));
  }

  canPlayAction(): boolean {
    if (!this.players || !this.card) return false;
    const human = this.players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return true;
    if (!human || !this.card) return false;

    const needsProperties = [
      ActionSet.Rent,
      ActionSet.DealSwap,
      ActionSet.DealDuel,
      ActionSet.House,
      ActionSet.Hotel
    ];

    if (needsProperties.includes(this.card.setAction!) && !this.humanHasProperties()) {
      return false;
    }

    if ((this.card.type === CardType.PropertyJoker) && !this.humanHasProperties()) {
      return false;
    }


    const selectedCount = this.selectedCards$.getValue().length;


    // PassGo : limite main
    if (this.card.setAction === ActionSet.PassGo) {
      const projectedHand = human.hand.length - selectedCount;
      return projectedHand <= 7;
    }

    // Rent : vérifier si le joueur a au moins une propriété correspondante
    if (this.card.setAction === ActionSet.Rent) {
      const rentColors: PropertySet[] = this.card.sets || [];
      return rentColors.some(color =>
        human.properties.some(p => p.setType === color || p.setType2 === color)
      );
    }

    // DealSwap
    if (this.card.setAction === ActionSet.DealSwap) {
      return human.properties.length > 0;
    }

    // DealDuel : vérifier si au moins un joueur cible a des propriétés éligibles
    if (this.card.setAction === ActionSet.DealDuel) {
      const targets = this.players.filter(p => p.name.toLowerCase() !== 'human');
      return targets.some(p => this.getEligiblePropertiesForDuel(p).length > 0);
    }

    if (this.card.setAction === ActionSet.House || this.card.setAction === ActionSet.Hotel) {
      return this.canPlayHouseOrHotel(this.card);
    }



    // Autres actions jouables par défaut
    return true;
  }


  getAvailableJokerColors(card: Card): PropertySet[] {
    const human = this.getHuman();
      if (!human) return [];

      const ownedColors = new Set<PropertySet>();

      for (const prop of human.properties) {
        if (prop.setType) ownedColors.add(prop.setType);
        if (prop.setType2) ownedColors.add(prop.setType2);
      }

      const allowed = card.setType2
        ? [card.setType!, card.setType2]
        : Array.from(ownedColors);

      return allowed.filter(color => ownedColors.has(color));
  }


  onDuelPropertySelected(propId: number) {
    if (!this.selectedCards$.getValue().length) return;

    const card = this.selectedCards$.getValue().find(c => c.setAction === ActionSet.DealDuel);
    if (!card) return;

    card.duelTargetPropId = propId;

    // La carte DealDuel devient jouée dès qu'une cible est choisie
    card.playAction = true;
    this.selectionChange.emit({ card, selected: true });


  }

  getDuelPropertiesForCard(card: Card): Card[] {
    if (!card.actionTargetId) return [];
    const target = this.players.find(p => p.id === card.actionTargetId);
    if (!target) return [];
    return this.getEligiblePropertiesForDuel(target);
  }

  getEligiblePropertiesForDuel(targetPlayer?: Player | null): Card[] {
    if (!targetPlayer) return [];

    // Grouper par couleur
    const sets: Record<PropertySet, Card[]> = {} as any;
    for (const prop of targetPlayer.properties) {
      if (!prop.setType) continue;
      const color = prop.setType as PropertySet;
      if (!sets[color]) sets[color] = [];
      sets[color].push(prop);
    }

    // Règles Monopoly Deal : on ne peut pas voler une série complète
    const requiredByColor: Partial<Record<PropertySet, number>> = {
      [PropertySet.Brown]: 2,
      [PropertySet.DarkBlue]: 2
      // autres = 3 par défaut
    };

    const eligible: Card[] = [];
    for (const [colorKey, cards] of Object.entries(sets)) {
      const color = colorKey as PropertySet;
      const needed = requiredByColor[color] ?? 3;
      if (cards.length < needed) {
        eligible.push(...cards); // toutes les cartes de cette couleur sont éligibles
      }
    }
    return eligible;
  }


  canPlayHouseOrHotel(card: Card): boolean {
    if (!this.card || !this.players) return false;

    const human = this.players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return false;

    // On ne peut pas placer sur les gares ou les utilities
    const forbiddenSets = [PropertySet.Railroad, PropertySet.UtilityElec, PropertySet.UtilityWater];

    // Récupérer les séries complètes du joueur humain
    const eligibleSeries = this.getEligibleSeries(card).filter(series => !forbiddenSets.includes(series.color));

    if (card.setAction === ActionSet.House) {
      // On peut poser une maison sur une série complète qui n'a pas encore de maison
      return eligibleSeries.some(series => !series.cards.some(c => c.hasHouse));
    }

    if (card.setAction === ActionSet.Hotel) {
      // On peut poser un hôtel sur une série qui a déjà une maison mais pas d'hôtel
      return eligibleSeries.some(series =>
        series.cards.some(c => c.hasHouse) && !series.cards.some(c => c.hasHotel)
      );
    }

    return false;
  }

  onPlaceHouseOrHotel(seriesColor: PropertySet) {
    if (!this.card) return;
    const human = this.players.find(p => p.name.toLowerCase() === 'human');
    if (!human) return;

    const series = human.properties.filter(p => p.setType === seriesColor);

    if (this.card.setAction === ActionSet.House) {
      series.forEach(c => c.hasHouse = true);
    } else if (this.card.setAction === ActionSet.Hotel) {
      series.forEach(c => c.hasHotel = true);
    }

    // On considère la carte comme jouée
    this.card.playAction = true;
    this.selectionChange.emit({ card: this.card, selected: true });
  }

  private getHuman(): Player | undefined {
    return this.players.find(p => p.name.toLowerCase() === 'human');
  }

  private humanHasProperties(): boolean {
    const human = this.getHuman();
    return !!human && human.properties.length > 0;
  }

}
