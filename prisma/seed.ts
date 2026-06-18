import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const url = new URL(process.env.DATABASE_URL!)
const pool = new pg.Pool({
  host: url.hostname,
  port: Number(url.port),
  database: url.pathname.slice(1),
  user: url.username,
  password: decodeURIComponent(url.password),
})

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

async function main() {
  console.log('🌱 Seeding database...')

  // Create default admin user
  const adminEmail = 'admin@subcon.com'
  const adminUsername = 'admin'
  const adminPassword = 'admin123'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    await prisma.user.create({
      data: {
        name: 'Administrator',
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })
    console.log(`✅ Admin user created: ${adminUsername} / ${adminPassword}`)
    console.log(`   Email: ${adminEmail}`)
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`)
  }

  // Create sample branches
  const branches = ['Branch A', 'Branch B', 'Branch C']
  for (const branchName of branches) {
    const existing = await prisma.branch.findUnique({
      where: { name: branchName },
    })
    if (!existing) {
      await prisma.branch.create({
        data: { name: branchName },
      })
      console.log(`✅ Branch created: ${branchName}`)
    }
  }

  console.log('🌱 Seeding complete!')
  console.log('')
  console.log('Default admin login:')
  console.log(`  Username: ${adminUsername}`)
  console.log(`  Email:    ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log('')
  console.log('Next steps:')
  console.log('1. Login as admin (use username or email)')
  console.log('2. Create branches')
  console.log('3. Create INPUTTER and VIEWER users for each branch')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })