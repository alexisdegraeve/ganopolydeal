import { Routes } from '@angular/router';
import { GameComponent } from '../game/game';
import { RulesComponent } from '../rules/rules';
import { AboutComponent } from '../about/about';

export const routes: Routes = [
  { path: '', redirectTo: 'game', pathMatch: 'full' }, // Route par défaut
  { path: 'game', component: GameComponent },
  { path: 'rules', component: RulesComponent },
  { path: 'about', component: AboutComponent },
];
