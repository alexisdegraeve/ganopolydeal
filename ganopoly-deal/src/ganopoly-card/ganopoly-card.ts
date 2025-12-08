import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Card, CardType, PropertySet, ActionSet } from '../models/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ganopoly-card',
  imports: [CommonModule, ],
  templateUrl: './ganopoly-card.html',
  styleUrl: './ganopoly-card.scss',
})
export class GanopolyCardComponent {
  @Input() card?: Card;
  @Output() selectionChange = new EventEmitter<{card: Card, selected: boolean}>();
  showFront = true;
  selected = false;
  CardType = CardType;
  PropertySet = PropertySet;
  ActionSet = ActionSet;

  toggleCard() {
    this.showFront = !this.showFront;
  }

  toggleSelected() {
     this.selected = !this.selected;
     if(this.card) this.selectionChange.emit({ card: this.card, selected: this.selected });
  }
}
