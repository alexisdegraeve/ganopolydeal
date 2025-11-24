import { Routes } from '@angular/router';
import { GameComponent } from '../game/game';

export const routes: Routes = [
  { path: '', redirectTo: 'game', pathMatch: 'full' }, // Route par défaut
  { path: 'game', component: GameComponent },
  // tu peux ajouter d'autres routes plus tard, ex:
  // { path: 'settings', component: SettingsComponent }
];
