export  enum DealColor {
  brown,
  lightBlue,
  pink,
  orange,
  red,
  yellow,
  green,
  darkBlue
}

export  enum DealAction {
  fight,
  swap,
  banco,
  joker,
  jackpot,
  birthday,
  multicolor,
  rent,
  doubleRent,
  start,
  house,
  hotel
}

export enum DealType {
  property,
  property_joker,
  propert_player,
  notes
}

export class Card {
  constructor(
    public cardType: DealType = DealType.property,
    public cardAction: DealAction | null = null,
    public color: DealColor = DealColor.lightBlue,
    public value: number = 0,
    public rent: number = 0,
    public total: number = 0
  ) {}
}
