const { PrismaClient } = require('../node_modules/@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

const standardUnits = [
  { name: 'Pieces', symbol: 'PCS' },
  { name: 'Kilograms', symbol: 'KG' },
  { name: 'Meters', symbol: 'MTR' },
  { name: 'Boxes', symbol: 'BOX' },
  { name: 'Liters', symbol: 'LTR' },
  { name: 'Sets', symbol: 'SET' },
  { name: 'Numbers', symbol: 'NOS' },
  { name: 'Grams', symbol: 'GMS' },
  { name: 'Millimeters', symbol: 'MM' },
  { name: 'Rolls', symbol: 'ROL' },
  { name: 'Packets', symbol: 'PKT' },
];

async function seedUnits() {
  console.log('Seeding standard Units of Measurement (UOM)...');
  for (const u of standardUnits) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: { name: u.name },
      create: { name: u.name, symbol: u.symbol },
    });
    console.log(`- ${unit.name} (${unit.symbol}) [ID: ${unit.id}]`);
  }
  const total = await prisma.unit.count();
  console.log(`\nTotal units in database: ${total}`);
  await prisma.$disconnect();
}

seedUnits().catch((e) => {
  console.error('Error seeding units:', e);
  process.exit(1);
});
