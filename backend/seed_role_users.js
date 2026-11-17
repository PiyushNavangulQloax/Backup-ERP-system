const { PrismaClient } = require('../node_modules/@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

const usersToSeed = [
  {
    email: 'admin@erp.local',
    firstName: 'System',
    lastName: 'Admin',
    roleName: 'Administrator',
    phone: '+1234567890',
  },
  {
    email: 'purchase@erp.local',
    firstName: 'David',
    lastName: 'Miller',
    roleName: 'Purchase User',
    phone: '+1234567892',
  },
  {
    email: 'stores@erp.local',
    firstName: 'Robert',
    lastName: 'Chen',
    roleName: 'Stores User',
    phone: '+1234567893',
  },
  {
    email: 'production@erp.local',
    firstName: 'Michael',
    lastName: 'Vance',
    roleName: 'Production User',
    phone: '+1234567894',
  },
  {
    email: 'packing@erp.local',
    firstName: 'Carlos',
    lastName: 'Gomez',
    roleName: 'Packing User',
    phone: '+1234567896',
  },
  {
    email: 'dispatch@erp.local',
    firstName: 'Thomas',
    lastName: 'Wright',
    roleName: 'Dispatch User',
    phone: '+1234567898',
  },
  {
    email: 'quality@erp.local',
    firstName: 'Elena',
    lastName: 'Rostova',
    roleName: 'Quality User',
    phone: '+1234567895',
  },
  {
    email: 'billing@erp.local',
    firstName: 'Anita',
    lastName: 'Deshmukh',
    roleName: 'Billing User',
    phone: '+1234567897',
  },
  {
    email: 'mgmt@erp.local',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    roleName: 'Management',
    phone: '+1234567891',
  },
];

async function seedRoleUsers() {
  console.log('Connecting to database...');
  const roles = await prisma.role.findMany();
  console.log(`Found ${roles.length} roles:`, roles.map((r) => r.name).join(', '));

  const roleMap = new Map();
  roles.forEach((r) => roleMap.set(r.name.toLowerCase().trim(), r.id));

  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  console.log('Password hash generated for Admin@12345');

  for (const u of usersToSeed) {
    let roleId = roleMap.get(u.roleName.toLowerCase().trim());
    if (!roleId) {
      // Fallback matching
      const found = roles.find(
        (r) =>
          r.name.toLowerCase().includes(u.roleName.toLowerCase().split(' ')[0]) ||
          u.roleName.toLowerCase().includes(r.name.toLowerCase())
      );
      if (found) {
        roleId = found.id;
      } else {
        roleId = roles[0].id;
      }
    }

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        isActive: true,
        roleId,
        firstName: u.firstName,
        lastName: u.lastName,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        roleId,
        isActive: true,
      },
      include: { role: true },
    });

    console.log(`✓ User seeded: ${user.email} | Role: ${user.role?.name} | Password: Admin@12345`);
  }

  const allUsers = await prisma.user.findMany({ include: { role: true } });
  console.log(`\nTotal users in database: ${allUsers.length}`);
  allUsers.forEach((u) => {
    console.log(`- ${u.email} (${u.role?.name || 'No Role'}) [Active: ${u.isActive}]`);
  });

  await prisma.$disconnect();
}

seedRoleUsers().catch((err) => {
  console.error('Failed to seed role users:', err);
  process.exit(1);
});
