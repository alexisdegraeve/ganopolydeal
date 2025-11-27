import { Component, Input } from '@angular/core';
import { Card } from '../models/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ganopoly-card',
  imports: [CommonModule],
  templateUrl: './ganopoly-card.html',
  styleUrl: './ganopoly-card.scss',
})
export class GanopolyCardComponent {
  @Input() card?: Card;
  showFront = true;

  toggleCard() {
    this.showFront = !this.showFront;
  }
}
