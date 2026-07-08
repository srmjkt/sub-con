import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Source: Supabase (old)
const SUPABASE_URL = new URL(
  'postgresql://postgres:srmjkt%402026@db.qmbjdwbzxrpruxsrgxjq.supabase.co:5432/postgres'
)
const sourcePool = new pg.Pool({
  host: SUPABASE_URL.hostname,
  port: Number(SUPABASE_URL.port),
  database: SUPABASE_URL.pathname.slice(1),
  user: SUPABASE_URL.username,
  password: decodeURIComponent(SUPABASE_URL.password),
  ssl: { rejectUnauthorized: false },
})
const sourcePrisma = new PrismaClient({ adapter: new PrismaPg(sourcePool) })

// Target: Neon (new)
const NEON_URL = new URL(process.env.DATABASE_URL!)
const targetPool = new pg.Pool({
  host: NEON_URL.hostname,
  port: Number(NEON_URL.port),
  database: NEON_URL.pathname.slice(1),
  user: NEON_URL.username,
  password: decodeURIComponent(NEON_URL.password),
  ssl: { rejectUnauthorized: false },
})
const targetPrisma = new PrismaClient({ adapter: new PrismaPg(targetPool) })

async function main() {
  console.log('🔄 Starting data migration from Supabase to Neon...')

  // Migrate Branches (use Supabase IDs to preserve foreign key relationships)
  const branches = await sourcePrisma.branch.findMany()
  console.log(`📦 Found ${branches.length} branches`)
  for (const b of branches) {
    const existing = await targetPrisma.branch.findFirst({ where: { name: b.name } })
    if (existing) {
      // If branch name exists with different ID, delete the seed one and recreate with Supabase ID
      if (existing.id !== b.id) {
        await targetPrisma.branch.delete({ where: { id: existing.id } })
        await targetPrisma.branch.create({ data: { id: b.id, name: b.name } })
        console.log(`  Re-mapped branch "${b.name}" from ${existing.id} to ${b.id}`)
      }
    } else {
      await targetPrisma.branch.create({ data: { id: b.id, name: b.name } })
    }
  }
  console.log(`✅ Migrated branches (preserved Supabase IDs)`)

  // Migrate Users (delete conflicting seed users first, then insert Supabase users)
  const users = await sourcePrisma.user.findMany()
  console.log(`📦 Found ${users.length} users`)
  for (const u of users) {
    // Delete any existing user with same username or email (from seed)
    const existingByEmail = await targetPrisma.user.findUnique({ where: { email: u.email } })
    if (existingByEmail && existingByEmail.id !== u.id) {
      await targetPrisma.user.delete({ where: { id: existingByEmail.id } })
      console.log(`  Removed seed user by email: ${u.email}`)
    }
    const existingByUsername = u.username ? await targetPrisma.user.findFirst({ where: { username: u.username } }) : null
    if (existingByUsername && existingByUsername.id !== u.id) {
      await targetPrisma.user.delete({ where: { id: existingByUsername.id } })
      console.log(`  Removed seed user by username: ${u.username}`)
    }
    
    let branchId = u.branchId
    if (branchId) {
      const branchExists = await targetPrisma.branch.findUnique({ where: { id: branchId } })
      if (!branchExists) branchId = null
    }
    await targetPrisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        username: u.username,
        email: u.email,
        password: u.password,
        role: u.role,
        branchId: branchId,
        branchAccess: u.branchAccess as any,
      },
      create: {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        password: u.password,
        role: u.role,
        branchId: branchId,
        branchAccess: u.branchAccess as any,
      },
    })
  }
  console.log(`✅ Migrated ${users.length} users (overwrote seed)`)

  // Migrate Employees (branchIds now match since we preserved Supabase IDs)
  const employees = await sourcePrisma.employee.findMany()
  console.log(`📦 Found ${employees.length} employees`)
  for (const e of employees) {
    await targetPrisma.employee.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        branchId: e.branchId,
        employeeId: e.employeeId,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        department: e.department,
        position: e.position,
        joinDate: e.joinDate,
        isActive: e.isActive,
      } as any,
    })
  }
  console.log(`✅ Migrated ${employees.length} employees`)

  // Migrate Incident Reports
  const incidents = await sourcePrisma.incidentReport.findMany()
  console.log(`📦 Found ${incidents.length} incident reports`)
  for (const i of incidents) {
    await targetPrisma.incidentReport.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id,
        branchId: i.branchId,
        title: i.title,
        description: i.description,
        severity: i.severity,
        date: i.date,
        location: i.location,
        incidentReportNumber: i.incidentReportNumber,
        status: i.status,
        reportedById: i.reportedById,
        customFieldsData: i.customFieldsData as any,
      },
    })
  }
  console.log(`✅ Migrated ${incidents.length} incident reports`)

  // Migrate other data models
  const models = [
    'attendanceRecord',
    'training',
    'simulation',
    'mockDrill',
    'inventory',
    'branchModuleConfig',
    'customField',
    'incidentAttachment',
    'incidentReportEdit',
    'attachment',
  ] as const

  for (const model of models) {
    // @ts-ignore - dynamic model access
    const records = await (sourcePrisma as any)[model].findMany()
    console.log(`📦 Found ${records.length} ${model}`)
    for (const r of records) {
      try {
        // @ts-ignore
        await (targetPrisma as any)[model].upsert({
          where: { id: r.id },
          update: {},
          create: r as any,
        })
      } catch (e) {
        console.log(`⚠️  Skipped ${model} record ${r.id}: ${(e as Error).message}`)
      }
    }
    console.log(`✅ Migrated ${records.length} ${model}`)
  }

  console.log('🎉 Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await sourcePrisma.$disconnect()
    await targetPrisma.$disconnect()
  })