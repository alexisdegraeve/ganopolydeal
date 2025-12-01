import { Component, Input } from '@angular/core';
import { Card, CardType, PropertySet } from '../models/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ganopoly-card',
  imports: [CommonModule, ],
  templateUrl: './ganopoly-card.html',
  styleUrl: './ganopoly-card.scss',
})
export class GanopolyCardComponent {
  @Input() card?: Card;
  showFront = false;
  selected = false;
  CardType = CardType;
  PropertySet = PropertySet;

  toggleCard() {
    this.showFront = !this.showFront;
  }

  toggleSelected() {
    this.selected = !this.selected;
  }
}
