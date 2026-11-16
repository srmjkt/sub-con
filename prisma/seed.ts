import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { INDONESIA_LOCATIONS } from '../lib/indonesiaLocations'

const url = new URL(process.env.DATABASE_URL!)
const pool = new pg.Pool({
  host: url.hostname,
  port: Number(url.port),
  database: url.pathname.slice(1),
  user: url.username,
  password: decodeURIComponent(url.password),
  ssl: { rejectUnauthorized: false },
})

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

async function main() {
  console.log('🌱 Seeding crime data only...')

  const provinceCrimeBase: Record<string, number> = {
    'DKI Jakarta': 4820,
    'Jawa Barat': 3950,
    'Jawa Tengah': 3210,
    'Jawa Timur': 2870,
    'Banten': 1940,
    'Sumatera Utara': 1760,
    'Bali': 1420,
    'Kalimantan Timur': 1280,
    'Riau': 1170,
    'Sumatera Selatan': 1040,
    'Lampung': 980,
    'Papua': 920,
    'Aceh': 870,
    'Sulawesi Selatan': 840,
    'Kalimantan Selatan': 790,
    'Nusa Tenggara Timur': 740,
    'Maluku': 690,
    'Sulawesi Utara': 640,
    'Kalimantan Tengah': 610,
    'Jambi': 580,
    'Kepulauan Riau': 560,
    'Bengkulu': 520,
    'Sumatera Barat': 490,
    'Gorontalo': 460,
    'Sulawesi Tengah': 430,
    'Nusa Tenggara Barat': 410,
    'Kepulauan Bangka Belitung': 380,
    'Kalimantan Utara': 350,
    'Sulawesi Tenggara': 320,
    'Sulawesi Barat': 290,
    'Maluku Utara': 260,
    'Papua Barat': 240,
    'Papua Selatan': 220,
    'Papua Tengah': 200,
    'Papua Pegunungan': 180,
    'Papua Barat Daya': 160,
    'Daerah Istimewa Yogyakarta': 710,
  }

  for (const province of INDONESIA_LOCATIONS.map((p) => p.province)) {
    const base = provinceCrimeBase[province] || Math.floor(Math.random() * 600) + 100
    for (const year of [2024, 2025, 2026]) {
      const crimeCount = Math.floor(base * (0.8 + Math.random() * 0.4))
      await prisma.crimeData.upsert({
        where: { province },
        update: { crimeCount, year },
        create: { province, crimeCount, year },
      })
    }
    console.log(`✅ Province crime data seeded: ${province}`)
  }

  for (const provinceData of INDONESIA_LOCATIONS) {
    const province = provinceData.province
    const provinceTotal = provinceCrimeBase[province] || Math.floor(Math.random() * 600) + 100
    const cities = provinceData.cities
    const cityCount = cities.length

    for (const city of cities) {
      const base = Math.floor(provinceTotal / cityCount)
      const crimeCount = Math.floor(base * (0.5 + Math.random()))
      for (const year of [2024, 2025, 2026]) {
        await prisma.regencyCrimeData.upsert({
          where: { province_city_year: { province, city: city.city, year } },
          update: { crimeCount },
          create: { province, city: city.city, crimeCount, year },
        })
      }

      const districts = city.districts
      const districtCount = districts.length
      for (const district of districts) {
        const districtBase = Math.floor(base / districtCount)
        const districtCrimeCount = Math.floor(districtBase * (0.5 + Math.random()))
        for (const year of [2024, 2025, 2026]) {
          await prisma.districtCrimeData.upsert({
            where: { province_city_district_year: { province, city: city.city, district, year } },
            update: { crimeCount: districtCrimeCount },
            create: { province, city: city.city, district, crimeCount: districtCrimeCount, year },
          })
        }
      }
      console.log(`✅ District crime data seeded: ${province} - ${city.city} (${districtCount} districts)`)
    }
    console.log(`✅ Regency crime data seeded: ${province} (${cityCount} cities)`)
  }

  console.log('🌱 Crime data seeding complete!')

  // ── OSINT seed data (safe public sources for testing) ──
  console.log('🕵️ Seeding OSINT sources...')

  const osintSources = [
    {
      name: 'Kompas News RSS',
      type: 'RSS_FEED' as const,
      target: 'https://indeks.kompas.com/headline/rss.xml',
      isEnabled: true,
    },
    {
      name: 'Detik News RSS',
      type: 'RSS_FEED' as const,
      target: 'https://rss.detik.com/index.php',
      isEnabled: true,
    },
    {
      name: 'CNN Indonesia RSS',
      type: 'RSS_FEED' as const,
      target: 'https://www.cnnindonesia.com/rss',
      isEnabled: true,
    },
    {
      name: 'GitHub: torvalds/linux',
      type: 'GITHUB_REPO' as const,
      target: 'torvalds/linux',
      isEnabled: true,
    },
    {
      name: 'Domain: google.com',
      type: 'DOMAIN' as const,
      target: 'google.com',
      isEnabled: true,
    },
    {
      name: 'IP: 8.8.8.8',
      type: 'IP_ADDRESS' as const,
      target: '8.8.8.8',
      isEnabled: true,
    },
  ]

  for (const source of osintSources) {
    const existing = await prisma.osintSource.findFirst({ where: { name: source.name } })
    if (!existing) {
      await prisma.osintSource.create({ data: source })
      console.log(`✅ OSINT source seeded: ${source.name}`)
    } else {
      console.log(`⏭️  OSINT source already exists: ${source.name}`)
    }
  }

  console.log('🕵️ OSINT seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
