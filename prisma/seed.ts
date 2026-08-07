import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { INDONESIA_LOCATIONS, getProvinceCode } from '../lib/indonesiaLocations'

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
    // Create sample employees for each branch
    const sampleEmployees = [
      { employeeId: 'EMP001', fullName: 'John Doe', email: 'john@example.com', phone: '555-0101', department: 'Security', position: 'Officer' },
      { employeeId: 'EMP002', fullName: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', department: 'Operations', position: 'Supervisor' },
      { employeeId: 'EMP003', fullName: 'Bob Johnson', email: 'bob@example.com', phone: '555-0103', department: 'Security', position: 'Guard' },
      { employeeId: 'EMP004', fullName: 'Alice Brown', email: 'alice@example.com', phone: '555-0104', department: 'Admin', position: 'Clerk' },
      { employeeId: 'EMP005', fullName: 'Charlie Wilson', email: 'charlie@example.com', phone: '555-0105', department: 'Operations', position: 'Manager' },
    ]
    
    for (const emp of sampleEmployees) {
      const existingEmp = await prisma.employee.findUnique({
        where: { branchId_employeeId: { branchId: branch.id, employeeId: emp.employeeId } },
      })
      if (!existingEmp) {
        await prisma.employee.create({
          data: { branchId: branch.id, ...emp, joinDate: new Date('2025-01-01') },
        })
        console.log(`✅ Employee created: ${emp.fullName} (${emp.employeeId}) for ${branch.name}`)
      }
    }
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

  // Create default module configurations for each branch
  const defaultModules = [
    { 
      module: 'incidents', 
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, order: 1, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 2, colSpan: 1 },
        { fieldName: 'severity', fieldLabel: 'Severity', fieldType: 'select', isRequired: true, order: 3, colSpan: 1, options: 'Low\nMedium\nHigh\nCritical', optionColors: { 'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444', 'Critical': '#7f1d1d' } },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Open\nInvestigating\nResolved\nClosed', optionColors: { 'Open': '#3b82f6', 'Investigating': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#6b7280' } },
        { fieldName: 'location', fieldLabel: 'Location', fieldType: 'text', isRequired: false, order: 5, colSpan: 1 },
      ]
    },
    { 
      module: 'attendance', 
      isEnabled: true,
      customFields: [
        { fieldName: 'employeeName', fieldLabel: 'Employee Name', fieldType: 'text', isRequired: true, order: 0, colSpan: 1 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 2, colSpan: 1, options: 'Present\nAbsent\nLate\nExcused', optionColors: { 'Present': '#10b981', 'Absent': '#ef4444', 'Late': '#f59e0b', 'Excused': '#3b82f6' } },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 3, colSpan: 2 },
      ]
    },
    { 
      module: 'trainings', 
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Training Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'duration', fieldLabel: 'Duration', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'trainer', fieldLabel: 'Trainer', fieldType: 'text', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Scheduled\nIn Progress\nCompleted\nCancelled', optionColors: { 'Scheduled': '#3b82f6', 'In Progress': '#f59e0b', 'Completed': '#10b981', 'Cancelled': '#ef4444' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 6, colSpan: 1 },
      ]
    },
    { 
      module: 'simulations', 
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Simulation Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'scenario', fieldLabel: 'Scenario', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'result', fieldLabel: 'Result', fieldType: 'select', isRequired: false, order: 4, colSpan: 1, options: 'Pass\nFail\nPartial', optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 6, colSpan: 2 },
      ]
    },
    { 
      module: 'mock_drills', 
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Drill Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'drillType', fieldLabel: 'Drill Type', fieldType: 'select', isRequired: true, order: 2, colSpan: 1, options: 'Fire\nEvacuation\nEarthquake\nFirst Aid\nSecurity', optionColors: { 'Fire': '#ef4444', 'Evacuation': '#f59e0b', 'Earthquake': '#dc2626', 'First Aid': '#3b82f6', 'Security': '#8b5cf6' } },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'result', fieldLabel: 'Result', fieldType: 'select', isRequired: false, order: 4, colSpan: 1, options: 'Pass\nFail\nPartial', optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 6, colSpan: 2 },
      ]
    },
    { 
      module: 'inventory', 
      isEnabled: true,
      customFields: [
        { fieldName: 'itemName', fieldLabel: 'Item Name', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'quantity', fieldLabel: 'Quantity', fieldType: 'number', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'unit', fieldLabel: 'Unit', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'category', fieldLabel: 'Category', fieldType: 'select', isRequired: false, order: 3, colSpan: 1, options: 'Equipment\nSupplies\nSafety\nMedical\nTools', optionColors: { 'Equipment': '#6b7280', 'Supplies': '#3b82f6', 'Safety': '#10b981', 'Medical': '#ef4444', 'Tools': '#f59e0b' } },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Available\nLow Stock\nOut of Stock\nMaintenance', optionColors: { 'Available': '#10b981', 'Low Stock': '#f59e0b', 'Out of Stock': '#ef4444', 'Maintenance': '#8b5cf6' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
      ]
    },
  ]

  for (const branch of branchesList) {
    for (const moduleConfig of defaultModules) {
      const existing = await prisma.branchModuleConfig.findUnique({
        where: {
          branchId_module: {
            branchId: branch.id,
            module: moduleConfig.module,
          },
        },
      })

      if (!existing) {
        const created = await prisma.branchModuleConfig.create({
          data: {
            branchId: branch.id,
            module: moduleConfig.module,
            isEnabled: moduleConfig.isEnabled,
            customFields: {
              create: moduleConfig.customFields.map(field => ({
                fieldName: field.fieldName,
                fieldLabel: field.fieldLabel,
                fieldType: field.fieldType,
                isRequired: field.isRequired,
                order: field.order,
                colSpan: field.colSpan,
                options: field.options || null,
                ...(field.optionColors && { optionColors: field.optionColors }),
              }))
            }
          },
          include: {
            customFields: true,
          }
        })
        console.log(`✅ Module config created: ${moduleConfig.module} (${branch.name}) with ${created.customFields.length} fields`)
      }
    }
  }

  // Seed sample crime data for provinces
  const provinceCrimeBase: Record<string, number> = {
    'DKI Jakarta': 4820, 'Jawa Barat': 3950, 'Jawa Tengah': 3210, 'Jawa Timur': 2870,
    'Banten': 1940, 'Sumatera Utara': 1760, 'Bali': 1420, 'Kalimantan Timur': 1280,
    'Riau': 1170, 'Sumatera Selatan': 1040, 'Lampung': 980, 'Papua': 920,
    'Aceh': 870, 'Sulawesi Selatan': 840, 'Kalimantan Selatan': 790, 'Nusa Tenggara Timur': 740,
    'Maluku': 690, 'Sulawesi Utara': 640, 'Kalimantan Tengah': 610, 'Jambi': 580,
    'Kepulauan Riau': 560, 'Bengkulu': 520, 'Sumatera Barat': 490, 'Gorontalo': 460,
    'Sulawesi Tengah': 430, 'Nusa Tenggara Barat': 410, 'Kepulauan Bangka Belitung': 380,
    'Bali': 370, 'Kalimantan Utara': 350, 'Sulawesi Tenggara': 320, 'Sulawesi Barat': 290,
    'Maluku Utara': 260, 'Papua Barat': 240, 'Papua Selatan': 220, 'Papua Tengah': 200,
    'Papua Pegunungan': 180, 'Papua Barat Daya': 160, 'Daerah Istimewa Yogyakarta': 710,
  }

  for (const province of INDONESIA_LOCATIONS.map(p => p.province)) {
    const base = provinceCrimeBase[province] || Math.floor(Math.random() * 600) + 100
    for (const year of [2024, 2025, 2026]) {
      const crimeCount = Math.floor(base * (0.8 + Math.random() * 0.4))
      await prisma.crimeData.upsert({
        where: { province },
        update: { crimeCount, year, notes: `Sample data for ${province} ${year}` },
        create: { province, crimeCount, year, notes: `Sample data for ${province} ${year}` },
      })
    }
    console.log(`✅ Province crime data seeded: ${province}`)
  }

  // Seed sample crime data for regencies/cities
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
          update: { crimeCount, notes: `Sample data for ${city.city} ${year}` },
          create: { province, city: city.city, crimeCount, year, notes: `Sample data for ${city.city} ${year}` },
        })
      }
    }
    console.log(`✅ Regency crime data seeded: ${province} (${cityCount} cities)`)
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