import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Card, CardType, PropertySet, ActionSet } from '../models/card';
import { CommonModule } from '@angular/common';
import { Player } from '../models/player';

@Component({
  selector: 'ganopoly-card',
  imports: [CommonModule,],
  templateUrl: './ganopoly-card.html',
  styleUrl: './ganopoly-card.scss',
})
export class GanopolyCardComponent {
  @Input() card?: Card;
  @Output() selectionChange = new EventEmitter<{ card: Card, selected: boolean }>();
  @Output() actionCardChange = new EventEmitter<{ card: Card, playAction: boolean }>();
  @Input() showFront = true;
  selected = false;
  CardType = CardType;
  PropertySet = PropertySet;
  ActionSet = ActionSet;
  @Input() readOnly = true;
  @Input() clickable = true;
  @Input() players: Player[] = [];

  toggleCard() {
    this.showFront = !this.showFront;
  }

  toggleSelected() {
    this.selected = !this.selected;
    if (this.card) this.selectionChange.emit({ card: this.card, selected: this.selected });
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

}
