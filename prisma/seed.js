const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding KWIZZ Radio database...');

  // Default password for seeded users: "KwizzPass2026!"
  const passwordHash = await argon2.hash('KwizzPass2026!');

  // 1. Seed Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kwizzradio.ca' },
    update: {},
    create: {
      email: 'admin@kwizzradio.ca',
      passwordHash,
      name: 'KWIZZ Station Manager',
      role: 'ADMIN',
      twoFactorEnabled: false
    }
  });

  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@kwizzradio.ca' },
    update: {},
    create: {
      email: 'editor@kwizzradio.ca',
      passwordHash,
      name: 'Content Editor',
      role: 'EDITOR',
      twoFactorEnabled: false
    }
  });

  const djUser = await prisma.user.upsert({
    where: { email: 'djroots@kwizzradio.ca' },
    update: {},
    create: {
      email: 'djroots@kwizzradio.ca',
      passwordHash,
      name: 'DJ Roots',
      role: 'DJ',
      twoFactorEnabled: false
    }
  });

  console.log('Seeded Users: Admin, Editor, DJ');

  // 2. Seed DJs
  const dj1 = await prisma.dJ.upsert({
    where: { slug: 'dj-roots' },
    update: {},
    create: {
      name: 'DJ Roots',
      slug: 'dj-roots',
      bio: 'Veteran selector spinning consciousness reggae, dub, and rocksteady vibes across Ottawa and internationally for over 15 years.',
      photoUrl: '/images/djs/dj-roots.jpg',
      socialTwitter: 'https://twitter.com/djrootsottawa',
      socialInstagram: 'https://instagram.com/djrootsottawa',
      active: true
    }
  });

  const dj2 = await prisma.dJ.upsert({
    where: { slug: 'empress-tanya' },
    update: {},
    create: {
      name: 'Empress Tanya',
      slug: 'empress-tanya',
      bio: 'Bringing fiery dancehall riddims, female empowerment, and Caribbean culture straight to your speakers.',
      photoUrl: '/images/djs/empress-tanya.jpg',
      socialInstagram: 'https://instagram.com/empresstanya',
      active: true
    }
  });

  const dj3 = await prisma.dJ.upsert({
    where: { slug: 'selector-sensational' },
    update: {},
    create: {
      name: 'Selector Sensational',
      slug: 'selector-sensational',
      bio: 'Ottawa party starter known for vibrant blends of reggae crossover, afrobeats, and soca energy.',
      photoUrl: '/images/djs/selector-sensational.jpg',
      active: true
    }
  });

  console.log('Seeded DJs');

  // 3. Seed Shows
  const show1 = await prisma.show.upsert({
    where: { slug: 'ottawa-reggae-morning' },
    update: {},
    create: {
      title: 'Ottawa Reggae Morning',
      slug: 'ottawa-reggae-morning',
      description: 'Start your weekday with smooth conscious reggae, uplifting roots, Ottawa community news, and good morning vibrations.',
      genre: 'Roots & Conscious Reggae',
      bannerUrl: '/images/shows/reggae-morning.jpg',
      djId: dj1.id,
      active: true
    }
  });

  const show2 = await prisma.show.upsert({
    where: { slug: 'dancehall-fever' },
    update: {},
    create: {
      title: 'Dancehall Fever',
      slug: 'dancehall-fever',
      description: 'High energy dancehall tracks, newest riddims from Kingston to Toronto, and hot club party mixes.',
      genre: 'Dancehall',
      bannerUrl: '/images/shows/dancehall-fever.jpg',
      djId: dj2.id,
      active: true
    }
  });

  const show3 = await prisma.show.upsert({
    where: { slug: 'caribbean-drive-time' },
    update: {},
    create: {
      title: 'Caribbean Drive Time',
      slug: 'caribbean-drive-time',
      description: 'The ultimate Ottawa afternoon soundtrack with reggae hits, lovers rock, and upbeat Caribbean grooves.',
      genre: 'Reggae & Lovers Rock',
      bannerUrl: '/images/shows/drive-time.jpg',
      djId: dj3.id,
      active: true
    }
  });

  const show4 = await prisma.show.upsert({
    where: { slug: 'roots-culture-sessions' },
    update: {},
    create: {
      title: 'Roots & Culture Sessions',
      slug: 'roots-culture-sessions',
      description: 'Sunday deep vinyl cuts, dub plates, foundation rocksteady, and discussions on reggae history.',
      genre: 'Roots, Dub & Foundation',
      bannerUrl: '/images/shows/roots-culture.jpg',
      djId: dj1.id,
      active: true
    }
  });

  console.log('Seeded Shows');

  // 4. Seed Schedule Slots (Days: 0 = Sun, 1 = Mon, ..., 6 = Sat)
  // Delete existing slots before reseeding to keep it clean
  await prisma.scheduleSlot.deleteMany({});

  const scheduleData = [
    // Monday to Friday: Morning show (07:00 - 11:00)
    ...[1, 2, 3, 4, 5].map(day => ({
      dayOfWeek: day,
      startTime: '07:00',
      endTime: '11:00',
      showId: show1.id,
      djId: dj1.id,
      timezone: 'America/Toronto'
    })),
    // Monday to Friday: Drive Time (15:00 - 19:00)
    ...[1, 2, 3, 4, 5].map(day => ({
      dayOfWeek: day,
      startTime: '15:00',
      endTime: '19:00',
      showId: show3.id,
      djId: dj3.id,
      timezone: 'America/Toronto'
    })),
    // Friday & Saturday Night: Dancehall Fever (20:00 - 24:00)
    {
      dayOfWeek: 5,
      startTime: '20:00',
      endTime: '23:59',
      showId: show2.id,
      djId: dj2.id,
      timezone: 'America/Toronto'
    },
    {
      dayOfWeek: 6,
      startTime: '20:00',
      endTime: '23:59',
      showId: show2.id,
      djId: dj2.id,
      timezone: 'America/Toronto'
    },
    // Sunday: Roots & Culture (12:00 - 16:00)
    {
      dayOfWeek: 0,
      startTime: '12:00',
      endTime: '16:00',
      showId: show4.id,
      djId: dj1.id,
      timezone: 'America/Toronto'
    }
  ];

  for (const slot of scheduleData) {
    await prisma.scheduleSlot.create({ data: slot });
  }

  console.log('Seeded Schedule Slots');

  // 5. Seed Announcements
  await prisma.announcement.deleteMany({});
  await prisma.announcement.create({
    data: {
      title: 'Ottawa Reggae Festival Broadcast',
      message: 'Catch KWIZZ Radio broadcasting live on-location from Lebreton Flats all weekend long! Tune in online or join us in person.',
      linkText: 'View Details',
      linkUrl: '/events',
      isActive: true,
      priority: 1
    }
  });

  // 6. Seed Events
  await prisma.event.upsert({
    where: { slug: 'ottawa-jerk-and-reggae-fest-2026' },
    update: {},
    create: {
      title: 'Ottawa Jerk & Reggae Fest 2026',
      slug: 'ottawa-jerk-and-reggae-fest-2026',
      description: 'Annual outdoor Caribbean festival featuring top Jamaican artists, local vendors, authentic food, and KWIZZ Radio DJ soundstages.',
      location: 'Lebreton Flats Park, Ottawa, ON',
      eventDate: new Date('2026-08-15T12:00:00Z'),
      bannerUrl: '/images/events/jerk-fest.jpg',
      ticketUrl: 'https://eventbrite.com/example-jerk-fest',
      isPublished: true
    }
  });

  await prisma.event.upsert({
    where: { slug: 'dancehall-sound-clash-ottawa' },
    update: {},
    create: {
      title: 'Capital Sound Clash 2026',
      slug: 'dancehall-sound-clash-ottawa',
      description: 'Four heavy-weight sound systems go head-to-head in Ottawa for the champion sound trophy. Powered by KWIZZ Radio.',
      location: 'Bronson Centre, 211 Bronson Ave, Ottawa, ON',
      eventDate: new Date('2026-10-18T20:00:00Z'),
      bannerUrl: '/images/events/sound-clash.jpg',
      ticketUrl: 'https://bronsoncentre.com/events',
      isPublished: true
    }
  });

  // 7. Seed Sponsors
  await prisma.sponsor.deleteMany({});
  const sp1 = await prisma.sponsor.create({
    data: {
      name: 'Island Flavours Ottawa',
      logoUrl: '/images/sponsors/island-flavours.svg',
      targetUrl: 'https://islandflavoursottawa.example.com',
      placement: 'HEADER',
      active: true
    }
  });

  const sp2 = await prisma.sponsor.create({
    data: {
      name: 'Capital Roots Records',
      logoUrl: '/images/sponsors/capital-roots.svg',
      targetUrl: 'https://capitalrootsrecords.example.com',
      placement: 'SIDEBAR',
      active: true
    }
  });

  const sp3 = await prisma.sponsor.create({
    data: {
      name: 'Ottawa Caribbean Association',
      logoUrl: '/images/sponsors/caribbean-association.svg',
      targetUrl: 'https://caribbeanottawa.example.com',
      placement: 'FOOTER',
      active: true
    }
  });

  console.log('Seeded Sponsors');

  // 8. Seed Site Settings
  const settings = [
    { key: 'stream_url', value: 'https://streaming.live365.com/b72076_128k.mp3', description: 'Primary Live365 Audio Stream URL', isPublic: true },
    { key: 'live365_station_id', value: 'a72076', description: 'Live365 Station ID', isPublic: true },
    { key: 'station_name', value: 'KWIZZ Radio', description: 'Station Name', isPublic: true },
    { key: 'station_tagline', value: "Ottawa's Premier Reggae & Dancehall Station", description: 'Station Tagline', isPublic: true },
    { key: 'station_city', value: 'Ottawa, ON, Canada', description: 'Broadcasting Location', isPublic: true },
    { key: 'station_timezone', value: 'America/Toronto', description: 'Station Default Timezone', isPublic: true },
    { key: 'contact_email', value: 'info@kwizzradio.ca', description: 'Public Contact Email', isPublic: true },
    { key: 'app_badges_enabled', value: 'false', description: 'Show iOS / Android App Store Badges', isPublic: true },
    { key: 'social_instagram', value: 'https://instagram.com/kwizzradio', description: 'Instagram Profile', isPublic: true },
    { key: 'social_twitter', value: 'https://x.com/kwizzradio', description: 'X / Twitter Profile', isPublic: true },
    { key: 'social_facebook', value: 'https://facebook.com/kwizzradio', description: 'Facebook Profile', isPublic: true },
    { key: 'social_youtube', value: 'https://youtube.com/@kwizzradio', description: 'YouTube Channel', isPublic: true }
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description, isPublic: s.isPublic },
      create: s
    });
  }

  console.log('Seeded Settings');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

