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
    // Ensure admin user has correct role, username, and password
    const needsUpdate = 
      !existingAdmin.username || 
      existingAdmin.username !== adminUsername ||
      existingAdmin.role !== 'ADMIN'
    
    if (needsUpdate) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12)
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          username: adminUsername,
          password: hashedPassword,
          role: 'ADMIN',
        },
      })
      console.log(`✅ Admin user fixed: username, password, and role set to ADMIN`)
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`)
    }
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

  // Create sample inputter and viewer users for each branch
  const branchesList = await prisma.branch.findMany()
  for (const branch of branchesList) {
    const inputterEmail = `inputter-${branch.name.toLowerCase().replace(' ', '-')}@subcon.com`
    const inputterUsername = `inputter-${branch.name.toLowerCase().replace(' ', '')}`
    const viewerEmail = `viewer-${branch.name.toLowerCase().replace(' ', '-')}@subcon.com`
    const viewerUsername = `viewer-${branch.name.toLowerCase().replace(' ', '')}`

    const existingInputter = await prisma.user.findUnique({ where: { email: inputterEmail } })
    if (!existingInputter) {
      const hashedInputterPassword = await bcrypt.hash('inputter123', 12)
      await prisma.user.create({
        data: {
          name: `Inputter - ${branch.name}`,
          username: inputterUsername,
          email: inputterEmail,
          password: hashedInputterPassword,
          role: 'INPUTTER',
          branchId: branch.id,
        },
      })
      console.log(`✅ Inputter created: ${inputterUsername} / inputter123 (${branch.name})`)
    }

    const existingViewer = await prisma.user.findUnique({ where: { email: viewerEmail } })
    if (!existingViewer) {
      const hashedViewerPassword = await bcrypt.hash('viewer123', 12)
      await prisma.user.create({
        data: {
          name: `Viewer - ${branch.name}`,
          username: viewerUsername,
          email: viewerEmail,
          password: hashedViewerPassword,
          role: 'VIEWER',
          branchId: branch.id,
        },
      })
      console.log(`✅ Viewer created: ${viewerUsername} / viewer123 (${branch.name})`)
    }
  }

  console.log('🌱 Seeding complete!')
  console.log('')
  console.log('Default admin login:')
  console.log(`  Username: ${adminUsername}`)
  console.log(`  Email:    ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log('')
  console.log('Sample inputter/viewer logins (for each branch):')
  console.log('  Inputter: inputter-{branch} / inputter123')
  console.log('  Viewer:   viewer-{branch} / viewer123')
  console.log('')
  console.log('Next steps:')
  console.log('1. Login as admin to manage users')
  console.log('2. Use inputter/viewer accounts to test the system')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })