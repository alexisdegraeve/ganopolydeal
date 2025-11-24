import { Routes } from '@angular/router';
import { Game } from '../game/game';

export const routes: Routes = [
  { path: '', redirectTo: 'game', pathMatch: 'full' }, // Route par défaut
  { path: 'game', component: Game },
  // tu peux ajouter d'autres routes plus tard, ex:
  // { path: 'settings', component: SettingsComponent }
];
