export type CityId = 'sky' | 'train' | 'ocean' | 'animal' | 'snow' | 'farm' | 'toy' | 'home' | 'garden' | 'kitchen';

export interface City {
  id: CityId;
  name: string;
  theme: string;
  words: string[];
  color: string;
  icon: string;
}

export interface Plane {
  id: string;
  realName: string;
  childName: string;
  size: 'small' | 'medium' | 'large' | 'extra-large';
  color: string;
}

export interface FlightRecord {
  cityId: CityId;
  timestamp: number;
  words: string[];
  story: string;
}

export interface UserStats {
  flightCount: number;
  visitedCities: CityId[];
}
