import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Card } from '../../models/card';

@Injectable({
  providedIn: 'root',
})
export class DeckService {

  constructor(private http: HttpClient) {}

  getCards(): Observable<Card[]> {
    return this.http.get<any[]>('/data/ganopoly.json');
  }

}
