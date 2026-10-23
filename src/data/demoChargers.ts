export type ConnectorType =
  | 'Type 2 AC'
  | 'Bharat AC001'
  | '15A 3-Pin Socket'
  | 'CCS2 DC';

export type IndianCity =
  | 'All Cities'
  | 'Bengaluru'
  | 'Pune'
  | 'Mumbai'
  | 'Delhi NCR'
  | 'Hyderabad'
  | 'Chennai';

export interface ChargerSlot {
  id: string;
  label: string;
  window: string;
  available: boolean;
}

export interface ChargerListing {
  id: string;
  title: string;
  locality: string;
  city: Exclude<IndianCity, 'All Cities'>;
  addressCue: string;
  distanceKm: number;
  connector: ConnectorType;
  powerKw: number;
  pricePerKwh: number;
  parkingType: string;
  operatingHours: string;
  availableNow: boolean;
  availabilityLabel: string;
  hostName: string;
  hostTenure: string;
  rating: number;
  reviewCount: number;
  completedSessions: number;
  hardwareModel: string;
  cableLengthMeters: number;
  accessNotes: string;
  compatibleVehicles: string[];
  mapPosition: { x: number; y: number };
  coordinates: { lat: string; lng: string };
  visualTheme: 'driveway-canopy' | 'stilt-pillar' | 'courtyard-bay' | 'bungalow-gate';
  slots: ChargerSlot[];
}

export interface HostBookingRequest {
  id: string;
  driverName: string;
  vehicleModel: string;
  batteryNeedKwh: number;
  requestedWindow: string;
  recurringLabel?: string;
  estimatedProceedsInr: number;
  status: 'pending' | 'approved' | 'declined';
}

export const DEMO_CHARGERS: ChargerListing[] = [
  {
    id: 'cs-blr-101',
    title: '12th Main Shaded Bungalow Driveway',
    locality: 'HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    addressCue: 'Off 100 Feet Road, near 12th Main Corner Park',
    distanceKm: 0.8,
    connector: 'Type 2 AC',
    powerKw: 7.4,
    pricePerKwh: 14,
    parkingType: 'Private Gated Driveway',
    operatingHours: '07:30 – 22:30 Daily',
    availableNow: true,
    availabilityLabel: 'Available today · 3 slots open',
    hostName: 'Arjun & Meera K.',
    hostTenure: 'Host since Jan 2026',
    rating: 4.9,
    reviewCount: 28,
    completedSessions: 64,
    hardwareModel: 'Exicom Spin Air 7.4 kW Type 2',
    cableLengthMeters: 5.5,
    accessNotes: 'Wide 14-ft sliding gate on 12th Main cross. Watchman opens gate on booking confirmation code; paved level bay fits SUVs up to 4.8m.',
    compatibleVehicles: ['Tata Nexon EV', 'MG ZS EV', 'BYD Atto 3', 'Hyundai Kona', 'Mahindra XUV400'],
    mapPosition: { x: 34, y: 38 },
    coordinates: { lat: '12.9719° N', lng: '77.6412° E' },
    visualTheme: 'driveway-canopy',
    slots: [
      { id: 's1', label: 'Morning Top-up', window: '09:00 – 12:00', available: true },
      { id: 's2', label: 'Afternoon Work Slot', window: '13:30 – 17:30', available: true },
      { id: 's3', label: 'Evening Full Charge', window: '18:30 – 22:30', available: true },
    ],
  },
  {
    id: 'cs-blr-102',
    title: 'Palm Grove Stilt Bay #B04',
    locality: '3rd Block, Koramangala',
    city: 'Bengaluru',
    addressCue: '8th Main Road, near St. John’s Wood',
    distanceKm: 1.9,
    connector: 'Type 2 AC',
    powerKw: 11.0,
    pricePerKwh: 16,
    parkingType: 'Covered Apartment Stilt Bay',
    operatingHours: '20:00 – 07:30 Overnight + Weekends',
    availableNow: true,
    availabilityLabel: 'Available tonight · Overnight slot',
    hostName: 'Vikramaditya R.',
    hostTenure: 'Host since Nov 2025',
    rating: 4.8,
    reviewCount: 19,
    completedSessions: 41,
    hardwareModel: 'ABB Terra AC Wallbox 11 kW (3-Phase)',
    cableLengthMeters: 6.0,
    accessNotes: 'RWA-approved visitor EV bay right beside security cabin. Dedicated 3-phase meter with RCCB + SPD protection.',
    compatibleVehicles: ['BYD Seal', 'MG ZS EV', 'Tata Curvv EV', 'Hyundai Ioniq 5', 'Kia EV6'],
    mapPosition: { x: 58, y: 64 },
    coordinates: { lat: '12.9352° N', lng: '77.6245° E' },
    visualTheme: 'stilt-pillar',
    slots: [
      { id: 's4', label: 'Evening Quick AC', window: '19:00 – 21:30', available: true },
      { id: 's5', label: 'Overnight Deep Charge', window: '21:30 – 07:00', available: true },
      { id: 's6', label: 'Saturday Morning', window: '08:00 – 12:00', available: false },
    ],
  },
  {
    id: 'cs-blr-103',
    title: 'Jayanagar 4th Block Heritage Carport',
    locality: '4th Block, Jayanagar',
    city: 'Bengaluru',
    addressCue: '30th Cross, 400m from Cool Joint junction',
    distanceKm: 3.1,
    connector: '15A 3-Pin Socket',
    powerKw: 3.3,
    pricePerKwh: 12,
    parkingType: 'Independent Ground Floor Carport',
    operatingHours: '08:00 – 20:00 Mon–Sat',
    availableNow: true,
    availabilityLabel: 'Available now · 2-wheeler & compact EV friendly',
    hostName: 'Smt. Nandini Murthy',
    hostTenure: 'Host since Feb 2026',
    rating: 5.0,
    reviewCount: 14,
    completedSessions: 39,
    hardwareModel: 'Legrand Heavy-Duty 16A Industrial EV Box + Energy Sub-meter',
    cableLengthMeters: 4.0,
    accessNotes: 'Ideal for commuters parking near Jayanagar Metro. Bring your portable 15A travel charger; digital kWh sub-meter reading visible on box.',
    compatibleVehicles: ['Tata Tiago EV', 'MG Comet EV', 'Ather 450X', 'Ola S1 Pro', 'Chetak Electric'],
    mapPosition: { x: 24, y: 74 },
    coordinates: { lat: '12.9299° N', lng: '77.5824° E' },
    visualTheme: 'bungalow-gate',
    slots: [
      { id: 's7', label: 'Mid-day Commuter Slot', window: '10:00 – 15:00', available: true },
      { id: 's8', label: 'Late Afternoon', window: '15:30 – 19:30', available: true },
    ],
  },
  {
    id: 'cs-pun-201',
    title: 'Lane 6 Tree-Canopy Courtyard Bay',
    locality: 'Koregaon Park',
    city: 'Pune',
    addressCue: 'North Main Road, Lane 6 residential enclave',
    distanceKm: 1.4,
    connector: 'Type 2 AC',
    powerKw: 7.4,
    pricePerKwh: 15,
    parkingType: 'Paved Forecourt Bay',
    operatingHours: '09:00 – 21:30 Daily',
    availableNow: true,
    availabilityLabel: 'Available today · Instant host response',
    hostName: 'Rohan Deshmukh',
    hostTenure: 'Host since Dec 2025',
    rating: 4.9,
    reviewCount: 22,
    completedSessions: 53,
    hardwareModel: 'Delta AC Mini Plus 7.4 kW',
    cableLengthMeters: 5.0,
    accessNotes: 'Direct street-level entry with CCTV coverage and shaded stone paving. Cafes on Lane 6 are a 3-minute walk while your car tops up.',
    compatibleVehicles: ['Tata Nexon EV', 'Mahindra XUV400', 'MG Windsor EV', 'BYD Atto 3'],
    mapPosition: { x: 72, y: 30 },
    coordinates: { lat: '18.5362° N', lng: '73.8940° E' },
    visualTheme: 'courtyard-bay',
    slots: [
      { id: 's9', label: 'Brunch & Work Window', window: '10:30 – 14:30', available: true },
      { id: 's10', label: 'Evening Top-up', window: '17:00 – 21:00', available: true },
    ],
  },
  {
    id: 'cs-mum-301',
    title: 'Pali Hill Co-op Society Visitor Bay #2',
    locality: 'Bandra West',
    city: 'Mumbai',
    addressCue: 'Off Nargis Dutt Road, Pali Hill',
    distanceKm: 2.2,
    connector: 'Type 2 AC',
    powerKw: 7.4,
    pricePerKwh: 18,
    parkingType: 'Gated Compound Ground Bay',
    operatingHours: '10:00 – 19:00 Weekdays',
    availableNow: false,
    availabilityLabel: 'Next slot tomorrow 10:00',
    hostName: 'Zoya & Kabir Merchant',
    hostTenure: 'Host since Jan 2026',
    rating: 4.7,
    reviewCount: 16,
    completedSessions: 31,
    hardwareModel: 'Tata Power EZ Home 7.2 kW Wallbox',
    cableLengthMeters: 5.0,
    accessNotes: 'While we commute to BKC on weekdays, our ground-level covered bay stays empty from 10 AM to 7 PM. Security registers vehicle number plate on entry.',
    compatibleVehicles: ['Tata Punch EV', 'MG ZS EV', 'Tata Nexon EV', 'Mercedes EQA'],
    mapPosition: { x: 46, y: 24 },
    coordinates: { lat: '19.0669° N', lng: '72.8263° E' },
    visualTheme: 'stilt-pillar',
    slots: [
      { id: 's11', label: 'Weekday Daytime Block', window: '10:30 – 15:30', available: false },
      { id: 's12', label: 'Tomorrow Morning', window: '10:00 – 14:00', available: true },
    ],
  },
  {
    id: 'cs-del-401',
    title: 'Vasant Vihar C-Block Independent Kothi',
    locality: 'Vasant Vihar',
    city: 'Delhi NCR',
    addressCue: 'Near Priya Market & Basant Lok',
    distanceKm: 1.6,
    connector: 'CCS2 DC',
    powerKw: 22.0,
    pricePerKwh: 19,
    parkingType: 'Private Front Verandah',
    operatingHours: '07:00 – 23:00 Daily',
    availableNow: true,
    availabilityLabel: 'Available now · Fast 22 kW DC wallbox',
    hostName: 'Col. Harpreet Gill (Retd.)',
    hostTenure: 'Host since Oct 2025',
    rating: 4.9,
    reviewCount: 34,
    completedSessions: 78,
    hardwareModel: 'Servotech 22 kW Compact DC Wallbox',
    cableLengthMeters: 6.5,
    accessNotes: 'Three-phase sanctioned domestic EV load with dedicated earthing pit. Straight drive-in access without tight turns.',
    compatibleVehicles: ['All CCS2 EVs', 'Tata Harrier EV', 'BYD Atto 3', 'MG ZS EV', 'Hyundai Ioniq 5'],
    mapPosition: { x: 80, y: 55 },
    coordinates: { lat: '28.5603° N', lng: '77.1613° E' },
    visualTheme: 'driveway-canopy',
    slots: [
      { id: 's13', label: '90-Min Rapid Session', window: '11:00 – 12:30', available: true },
      { id: 's14', label: 'Afternoon Rapid Session', window: '15:00 – 16:30', available: true },
      { id: 's15', label: 'Evening Rapid Session', window: '19:30 – 21:00', available: true },
    ],
  },
  {
    id: 'cs-hyd-501',
    title: 'Road No. 45 Courtyard Charger',
    locality: 'Jubilee Hills',
    city: 'Hyderabad',
    addressCue: '300m from Peddamma Temple Metro',
    distanceKm: 2.5,
    connector: 'Bharat AC001',
    powerKw: 3.3,
    pricePerKwh: 13,
    parkingType: 'Shaded Side Driveway',
    operatingHours: '08:30 – 21:30 Daily',
    availableNow: true,
    availabilityLabel: 'Available today · ₹13/kWh',
    hostName: 'Siddharth Rao',
    hostTenure: 'Host since Feb 2026',
    rating: 4.8,
    reviewCount: 11,
    completedSessions: 26,
    hardwareModel: 'Fortum Bharat AC001 Smart Box',
    cableLengthMeters: 4.5,
    accessNotes: 'Level driveway shaded by gulmohar trees. Separate sub-meter display; gate intercom connects directly to host mobile.',
    compatibleVehicles: ['Tata Tigor EV', 'Tata Tiago EV', 'MG Comet EV', 'Citroën eC3'],
    mapPosition: { x: 18, y: 48 },
    coordinates: { lat: '17.4319° N', lng: '78.4071° E' },
    visualTheme: 'courtyard-bay',
    slots: [
      { id: 's16', label: 'Morning Commute Slot', window: '09:00 – 13:00', available: true },
      { id: 's17', label: 'Evening Slot', window: '16:30 – 20:30', available: true },
    ],
  },
  {
    id: 'cs-maa-601',
    title: 'Gandhi Nagar 2nd Main Breezeway',
    locality: 'Adyar',
    city: 'Chennai',
    addressCue: 'Near Adyar Signal & Kasturba Nagar MRTS',
    distanceKm: 1.2,
    connector: 'Type 2 AC',
    powerKw: 7.4,
    pricePerKwh: 14,
    parkingType: 'Covered Residential Portico',
    operatingHours: '07:00 – 22:00 Daily',
    availableNow: true,
    availabilityLabel: 'Available today · Recurring slots open',
    hostName: 'Karthik & Divya S.',
    hostTenure: 'Host since Jan 2026',
    rating: 4.9,
    reviewCount: 21,
    completedSessions: 47,
    hardwareModel: 'Statiq Nectar 7.4 kW Home Wallbox',
    cableLengthMeters: 5.5,
    accessNotes: 'Elevated flood-resilient portico above street level. Easy reverse-in parking from a quiet residential lane.',
    compatibleVehicles: ['Tata Nexon EV', 'MG Windsor EV', 'Mahindra XUV400', 'Hyundai Kona'],
    mapPosition: { x: 64, y: 80 },
    coordinates: { lat: '13.0067° N', lng: '80.2565° E' },
    visualTheme: 'bungalow-gate',
    slots: [
      { id: 's18', label: 'Morning Slot', window: '08:00 – 12:00', available: true },
      { id: 's19', label: 'Evening Overnight Start', window: '18:00 – 22:00', available: true },
    ],
  },
];

export const INITIAL_HOST_REQUESTS: HostBookingRequest[] = [
  {
    id: 'req-1',
    driverName: 'Pranav Kulkarni',
    vehicleModel: 'Tata Nexon EV Empowered+ (40.5 kWh)',
    batteryNeedKwh: 26,
    requestedWindow: 'Today · 18:30 – 22:00 (Active draw ~3.5 hrs)',
    recurringLabel: 'Requests Tue & Thu routine slot',
    estimatedProceedsInr: 320,
    status: 'pending',
  },
  {
    id: 'req-2',
    driverName: 'Ananya Sharma',
    vehicleModel: 'MG ZS EV Exclusive (50.3 kWh)',
    batteryNeedKwh: 32,
    requestedWindow: 'Tomorrow · 09:30 – 14:00 (Active draw ~4.3 hrs)',
    estimatedProceedsInr: 394,
    status: 'pending',
  },
  {
    id: 'req-3',
    driverName: 'Devraj Nair',
    vehicleModel: 'BYD Atto 3 (60.48 kWh)',
    batteryNeedKwh: 28,
    requestedWindow: 'Thu, 24 Oct · 19:00 – 23:00',
    recurringLabel: 'Verified neighbour · 6 prior charges',
    estimatedProceedsInr: 345,
    status: 'approved',
  },
];
