export interface CampusLocation {
  id: string;
  name: string;
  description: string;
  category:
    | 'Lecture Hall'
    | 'Hostel'
    | 'Cafeteria'
    | 'Lab'
    | 'ATM'
    | 'Library'
    | 'Admin'
    | 'Recreation';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  googleMapsUrl: string;
}

export const campusLocations: CampusLocation[] = [
  {
    id: '1',
    name: 'Main Lecture Theatre',
    description: 'Primary venue for large lectures and university events',
    category: 'Lecture Hall',
    coordinates: { latitude: 6.5244, longitude: 3.3792 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5244,3.3792',
  },
  {
    id: '2',
    name: 'Computer Science Lab A',
    description: 'Main programming lab with 50 workstations',
    category: 'Lab',
    coordinates: { latitude: 6.5245, longitude: 3.3793 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5245,3.3793',
  },
  {
    id: '3',
    name: 'University Library',
    description: '24/7 study space with extensive digital resources',
    category: 'Library',
    coordinates: { latitude: 6.5246, longitude: 3.3794 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5246,3.3794',
  },
  {
    id: '4',
    name: 'Student Cafeteria',
    description: 'Main dining hall serving local and international cuisine',
    category: 'Cafeteria',
    coordinates: { latitude: 6.5247, longitude: 3.3795 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5247,3.3795',
  },
  {
    id: '5',
    name: 'Male Hostel Block A',
    description: 'Accommodation for 200 male students',
    category: 'Hostel',
    coordinates: { latitude: 6.5248, longitude: 3.3796 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5248,3.3796',
  },
  {
    id: '6',
    name: 'Female Hostel Block B',
    description: 'Accommodation for 180 female students',
    category: 'Hostel',
    coordinates: { latitude: 6.5249, longitude: 3.3797 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5249,3.3797',
  },
  {
    id: '7',
    name: 'GTBank ATM',
    description: 'ATM services available 24/7',
    category: 'ATM',
    coordinates: { latitude: 6.525, longitude: 3.3798 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5250,3.3798',
  },
  {
    id: '8',
    name: 'Sports Complex',
    description: 'Basketball court, football field, and gym facilities',
    category: 'Recreation',
    coordinates: { latitude: 6.5251, longitude: 3.3799 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5251,3.3799',
  },
  {
    id: '9',
    name: 'Administrative Block',
    description: 'Student affairs, registrar, and administrative offices',
    category: 'Admin',
    coordinates: { latitude: 6.5252, longitude: 3.38 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5252,3.3800',
  },
  {
    id: '10',
    name: 'Engineering Lab Complex',
    description: 'Specialized labs for engineering students',
    category: 'Lab',
    coordinates: { latitude: 6.5253, longitude: 3.3801 },
    googleMapsUrl: 'https://maps.google.com/?q=6.5253,3.3801',
  },
];

export const getLocationsByCategory = (
  category: CampusLocation['category']
) => {
  return campusLocations.filter(location => location.category === category);
};

export const getLocationById = (id: string) => {
  return campusLocations.find(location => location.id === id);
};
