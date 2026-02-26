import { City, Plane } from './types';

export const CITIES: City[] = [
  {
    id: 'sky',
    name: 'Sky City',
    theme: 'Sky & Flight',
    color: 'bg-sky-100',
    icon: '☁️',
    words: ['sky', 'cloud', 'sun', 'wind', 'airport', 'fly', 'blue', 'high', 'fast', 'pilot']
  },
  {
    id: 'train',
    name: 'Train Town',
    theme: 'Trains',
    color: 'bg-orange-50',
    icon: '🚂',
    words: ['train', 'track', 'station', 'ticket', 'driver', 'stop', 'go', 'big', 'red', 'whistle']
  },
  {
    id: 'ocean',
    name: 'Ocean Bay',
    theme: 'Ocean',
    color: 'bg-blue-50',
    icon: '🌊',
    words: ['ocean', 'fish', 'boat', 'wave', 'blue', 'swim', 'shell', 'sand', 'sea', 'happy']
  },
  {
    id: 'animal',
    name: 'Animal Forest',
    theme: 'Animals',
    color: 'bg-emerald-50',
    icon: '🌳',
    words: ['lion', 'bird', 'tree', 'run', 'jump', 'green', 'forest', 'friend', 'play', 'small']
  },
  {
    id: 'snow',
    name: 'Snow Mountain',
    theme: 'Weather',
    color: 'bg-slate-50',
    icon: '🏔️',
    words: ['snow', 'cold', 'white', 'mountain', 'coat', 'ice', 'wind', 'hat', 'walk', 'slow']
  },
  {
    id: 'farm',
    name: 'Sweet Farm',
    theme: 'Farm Life',
    color: 'bg-yellow-50',
    icon: '🚜',
    words: ['cow', 'duck', 'pig', 'horse', 'sheep', 'egg', 'milk', 'farm', 'corn', 'barn']
  },
  {
    id: 'toy',
    name: 'Toy Room',
    theme: 'Play Time',
    color: 'bg-pink-50',
    icon: '🧸',
    words: ['doll', 'ball', 'car', 'block', 'book', 'puzzle', 'bear', 'robot', 'drum', 'box']
  },
  {
    id: 'home',
    name: 'Happy Home',
    theme: 'Family',
    color: 'bg-rose-50',
    icon: '🏠',
    words: ['mom', 'dad', 'baby', 'bed', 'chair', 'door', 'lamp', 'cup', 'spoon', 'home']
  },
  {
    id: 'garden',
    name: 'Garden Park',
    theme: 'Nature',
    color: 'bg-lime-50',
    icon: '🦋',
    words: ['bee', 'bug', 'leaf', 'grass', 'rose', 'dirt', 'seed', 'ant', 'frog', 'pond']
  },
  {
    id: 'kitchen',
    name: 'Yummy Kitchen',
    theme: 'Food',
    color: 'bg-amber-50',
    icon: '🍎',
    words: ['apple', 'cake', 'pear', 'juice', 'rice', 'soup', 'bread', 'fish', 'meat', 'egg']
  }
];

export const PLANES: Plane[] = [
  { id: 'b737', realName: 'Boeing 737', childName: 'Super Red Jet', size: 'small', color: 'text-red-500' },
  { id: 'b747', realName: 'Boeing 747', childName: 'Giant Blue Whale', size: 'large', color: 'text-blue-600' },
  { id: 'b777', realName: 'Boeing 777', childName: 'Long Silver Bird', size: 'medium', color: 'text-slate-400' },
  { id: 'b787', realName: 'Boeing 787', childName: 'Fast White Dream', size: 'medium', color: 'text-sky-400' },
  { id: 'a320', realName: 'Airbus A320', childName: 'Sunny Yellow Flyer', size: 'small', color: 'text-yellow-500' },
  { id: 'a330', realName: 'Airbus A330', childName: 'Cool Green Glider', size: 'medium', color: 'text-emerald-500' },
  { id: 'a350', realName: 'Airbus A350', childName: 'Purple Star Hopper', size: 'medium', color: 'text-purple-500' },
  { id: 'a380', realName: 'Airbus A380', childName: 'Mega Orange King', size: 'extra-large', color: 'text-orange-500' },
  { id: 'c909', realName: 'COMAC C909', childName: 'Little Pink Friend', size: 'small', color: 'text-pink-400' },
  { id: 'c919', realName: 'COMAC C919', childName: 'Bright Teal Explorer', size: 'medium', color: 'text-teal-500' },
  { id: 'c929', realName: 'COMAC C929', childName: 'Royal Indigo Chief', size: 'large', color: 'text-indigo-600' }
];
