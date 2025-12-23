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
  Multi = 'Multi',
  PassGo = 'PassGo',
  Hotel = 'Hotel',
  House = 'House'
}

export enum ActionSet {
  PassGo = 'PassGo',
  Hotel = 'Hotel',
  House = 'House',
  DoubleRent = 'DoubleRent',
  Birthday = 'Birthday',
  DealJackpot = 'DealJackpot',
  Joker = 'Joker',
  DealBanco ='DealBanco',
  DealDuel = 'DealDuel',
  DealSwap = 'DealSwap',
  Rent = 'Rent'

}

export interface Card {
  id: number;
  type: CardType;
  name?: string;
  value?: number;
  setType?: PropertySet;       // Color or utility/railroad
  setType2?: PropertySet;
  setAction?: ActionSet;   // For jokers: second possible set
  sets?: PropertySet[];        // For multi-color jokers or rent cards
  setSize?: number;
  rent?: number;
  playAction?: boolean;
  actionTargetId?: number;
  rentColor?: PropertySet;
  targetSeries?: PropertySet;
  duelTargetPropId?: number;
  hasHouse?: boolean;
  hasHotel?: boolean;
  jokerColor?: PropertySet;
}

export const ALL_PROPERTY_COLORS = [
  PropertySet.Brown, PropertySet.DarkBlue, PropertySet.LightBlue, PropertySet.Pink,
  PropertySet.Orange, PropertySet.Red, PropertySet.Yellow, PropertySet.Green,
  PropertySet.Railroad, PropertySet.UtilityElec, PropertySet.UtilityWater
];
