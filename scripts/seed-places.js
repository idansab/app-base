// Seed script: Create sample places with new categories only
// Categories: coffee_food, trips, nightlife, shopping, culture

const API_BASE = 'http://localhost:3001/api';

const newPlaces = [
  {
    name: 'עגלת קפה של גלעד',
    category: 'coffee_food',
    city: 'תל אביב',
    address: 'רחוב דיזנגוף 50',
    lat: 32.0853,
    lng: 34.7694,
    short_description: 'קפה עם חלומות קטנים לחיות',
    description: 'עגלת קפה ייחודית ברחוב דיזנגוף. מגיש קפה ספיציאליטי וקינוחים תוצרת בית.',
    image_url: 'https://picsum.photos/seed/coffee-cart/600/400',
    rating: 4.7,
    opening_hours: '07:00-19:00',
    phone: '050-1234567',
    tags: ['קפה', 'ספיציאליטי', 'מהיר'],
  },
  {
    name: 'טיול סלעים בנחל דוד',
    category: 'trips',
    city: 'ירושלים',
    address: 'נחל דוד',
    lat: 31.7683,
    lng: 35.2137,
    short_description: 'טיול מרוגע בנחל היפה ביותר בעיר',
    description: 'טיול משפחתי יפה בנחל דוד עם מפלים קטנים וביצות. מתאים לכל הגילאים.',
    image_url: 'https://picsum.photos/seed/hike-stream/600/400',
    rating: 4.8,
    opening_hours: '06:00-18:00',
    phone: '02-5678910',
    tags: ['טבע', 'משפחה', 'מים'],
  },
  {
    name: 'בר הלילה "כוכבים"',
    category: 'nightlife',
    city: 'תל אביב',
    address: 'רחוב לבונון 80',
    lat: 32.0746,
    lng: 34.7694,
    short_description: 'בר בוטיק עם מוזיקה חיה וקוקטיילים משובחים',
    description: 'בר אלגנטי בלילה עם DJ וקוקטיילים בעבודת יד. אטמוספירה רומנטית ומרגיעה.',
    image_url: 'https://picsum.photos/seed/bar-night/600/400',
    rating: 4.6,
    opening_hours: '20:00-04:00',
    phone: '03-5634789',
    tags: ['בר', 'מוזיקה', 'קוקטיילים'],
  },
  {
    name: 'שוק הרמלה - קניות ושוק',
    category: 'shopping',
    city: 'רמללה',
    address: 'שוק הרמלה המרכזי',
    lat: 31.9454,
    lng: 35.1971,
    short_description: 'שוק מסורתי פלסטיני עם סחורה מקומית וזולה',
    description: 'שוק חוזר עם בגדים, דברי חשמל, וצעצועים. חווית קניות אמיתית בשוק',
    image_url: 'https://picsum.photos/seed/market/600/400',
    rating: 4.4,
    opening_hours: '08:00-20:00',
    phone: '02-2954321',
    tags: ['שוק', 'קניות', 'מקומי'],
  },
  {
    name: 'מוזיאון ישראל',
    category: 'culture',
    city: 'ירושלים',
    address: 'רחוב משה ברנט 11',
    lat: 31.7683,
    lng: 35.2291,
    short_description: 'מוזיאון גדול עם אוספים עתיקים וקוראים מודרניים',
    description: 'מוזיאון ישראל היא המוסד המוביל בתחום הקולנוע והאמנויות בעולם. בעלת אוספי עתיקות יהודים ועברים',
    image_url: 'https://picsum.photos/seed/museum/600/400',
    rating: 4.9,
    opening_hours: '10:00-17:00',
    phone: '02-6708811',
    tags: ['תרבות', 'מוזיאון', 'אמנות'],
  },
  {
    name: 'מקום האוכל של אבו - חומוס וממלחות',
    category: 'coffee_food',
    city: 'רמdeservallah',
    address: 'שוק הרמלה',
    lat: 31.9454,
    lng: 35.1971,
    short_description: 'חומוס עתיק בעבודת יד וממלחות טריות',
    description: 'מקום מטבח פלסטיני אמיתי בשוק הרמלה. חומוס, ממלחות וכל מנה מבושלת בידיים',
    image_url: 'https://picsum.photos/seed/hummus/600/400',
    rating: 4.9,
    opening_hours: '06:00-15:00',
    phone: '02-2951234',
    tags: ['אוכל', 'מקומי', 'טבעי'],
  },
  {
    name: 'טיול קניון יניא',
    category: 'trips',
    city: 'אילת',
    address: 'קניוניא מימן לאילת',
    lat: 29.5477,
    lng: 34.9516,
    short_description: 'טיול אדוון בקניון מרהיב עם שפכים יפים',
    description: 'טיול היום מרוגע או אתגרי - בחר לך. קניוני יניא הוא אחד מיפים ביותר בישראל.',
    image_url: 'https://picsum.photos/seed/canyon/600/400',
    rating: 4.8,
    opening_hours: '07:00-17:00',
    phone: '08-6374532',
    tags: ['טבע', 'ספורט', 'אדוון'],
  },
  {
    name: 'בית הקפה "תרבות"',
    category: 'culture',
    city: 'תל אביב',
    address: 'רחוב שקט 15',
    lat: 32.0873,
    lng: 34.7710,
    short_description: 'קפה תרבותי עם תערוכות וכוורים קטנים',
    description: 'בית קפה המתאפר כמוקד תרבותי. נערוכות קבועות של אמנים מקומיים וערבי מוזיקה חיה',
    image_url: 'https://picsum.photos/seed/culture-cafe/600/400',
    rating: 4.7,
    opening_hours: '09:00-23:00',
    phone: '03-5632145',
    tags: ['קפה', 'תרבות', 'אמנות'],
  },
];

async function seedPlaces() {
  console.log('Starting to seed places with new categories...\n');

  let created = 0;
  let failed = 0;

  for (const place of newPlaces) {
    try {
      const res = await fetch(`${API_BASE}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(place),
      });

      if (res.ok) {
        const data = await res.json();
        created++;
        console.log(`✅ Created: ${place.name}`);
      } else {
        failed++;
        console.error(`❌ Failed to create: ${place.name}`);
      }
    } catch (error) {
      failed++;
      console.error(`❌ Error creating ${place.name}:`, error.message);
    }
  }

  console.log(`\n📊 Seeding complete!`);
  console.log(`✅ Created: ${created}, ❌ Failed: ${failed}`);
}

// Run seeding
seedPlaces();
