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
    const colors: PropertySet[] = [];
    if (card.setType) colors.push(card.setType);
    if (card.setType2) colors.push(card.setType2);
    return colors;
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

    if (this.card.setAction === ActionSet.DealSwap) {
      return human.properties.length > 0;
    }

    // Autres actions jouables par défaut
    return true;
  }


getAvailableJokerColors(card: Card): PropertySet[] {
  if (!card) return [];

  const human = this.players.find(p => p.name.toLowerCase() === 'human');
  if (!human) return [];

  const setsCount: Partial<Record<PropertySet, number>> = {};
  for (const prop of human.properties) {
    if (prop.setType) setsCount[prop.setType] = (setsCount[prop.setType] || 0) + 1;
    if (prop.setType2) setsCount[prop.setType2] = (setsCount[prop.setType2] || 0) + 1;
  }

  const maxNeeded: Partial<Record<PropertySet, number>> = {
    [PropertySet.Brown]: 2,
    [PropertySet.DarkBlue]: 2
  };

  // Si le Joker est limité à certaines couleurs
  const candidateColors = card.setType2 ? [card.setType!, card.setType2] : Object.values(PropertySet);

  return candidateColors.filter(color => {
    const needed = maxNeeded[color] ?? 3;
    return (setsCount[color] ?? 0) < needed;
  });
}




}
