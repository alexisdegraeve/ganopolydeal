// export  enum DealColor {
//   brown,
//   lightBlue,
//   pink,
//   orange,
//   red,
//   yellow,
//   green,
//   darkBlue
// }

// export  enum DealAction {
//   fight,
//   swap,
//   banco,
//   joker,
//   jackpot,
//   birthday,
//   multicolor,
//   rent,
//   doubleRent,
//   start,
//   house,
//   hotel
// }

// export enum DealType {
//   property,
//   property_joker,
//   propert_player,
//   notes
// }

// export class Card {
//   constructor(
//     public cardType: DealType = DealType.property,
//     public cardAction: DealAction | null = null,
//     public color: DealColor = DealColor.lightBlue,
//     public value: number = 0,
//     public rent: number = 0,
//     public total: number = 0
//   ) {}
// }

export enum CardType {
  Property = 'property',
  PropertyJoker = 'property_joker',
  Action = 'action',
  Rent = 'rent',
  Money = 'money',
  Rule = 'rule'
}

export enum PropertySet {
  Brown = 'Brown',
  LightBlue = 'LightBlue',
  Pink = 'Pink',
  Orange = 'Orange',
  Red = 'Red',
  Yellow = 'Yellow',
  Green = 'Green',
  DarkBlue = 'DarkBlue',
  Railroad = 'Railroad',
  Utility = 'Utility',
  UtilityElec = 'UtilityElec',
  UtilityWater = 'UtilityWater',
  Multi = 'Multi'
}

export interface Card {
  id: number;
  type: CardType;
  name?: string;
  value?: number;
  setType?: PropertySet;       // Color or utility/railroad
  setType2?: PropertySet;      // For jokers: second possible set
  sets?: PropertySet[];        // For multi-color jokers or rent cards
  valueCount?: number;
  rent?: number;
}

