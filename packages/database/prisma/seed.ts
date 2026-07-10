import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Rumah Makan Padang Minang Raya',
      address: 'Jl. Sudirman No. 45, Jakarta Selatan',
      phone: '021-5551234',
    },
  });

  console.log(`Created Restaurant: ${restaurant.name} (${restaurant.id})`);

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      username: 'admin',
      passwordHash,
      name: 'Budi Santoso (Admin)',
      role: 'OWNER',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      username: 'kasir',
      passwordHash,
      name: 'Siti Rahma (Kasir)',
      role: 'CASHIER',
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      username: 'dapur',
      passwordHash,
      name: 'Chef Ahmad (Dapur)',
      role: 'KITCHEN',
    },
  });

  console.log('Created Users: admin, kasir, dapur');

  const table1 = await prisma.table.create({
    data: {
      restaurantId: restaurant.id,
      number: '01',
      qrCodeUrl: '',
    },
  });

  const table2 = await prisma.table.create({
    data: {
      restaurantId: restaurant.id,
      number: '02',
      qrCodeUrl: '',
    },
  });

  const table3 = await prisma.table.create({
    data: {
      restaurantId: restaurant.id,
      number: '03',
      qrCodeUrl: '',
    },
  });

  await prisma.table.update({
    where: { id: table1.id },
    data: { qrCodeUrl: `/order?tableId=${table1.id}` },
  });

  await prisma.table.update({
    where: { id: table2.id },
    data: { qrCodeUrl: `/order?tableId=${table2.id}` },
  });

  await prisma.table.update({
    where: { id: table3.id },
    data: { qrCodeUrl: `/order?tableId=${table3.id}` },
  });

  console.log(`Created tables: 01 (${table1.id}), 02 (${table2.id}), 03 (${table3.id})`);

  const catMakanan = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Makanan Utama',
    },
  });

  const catLauk = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Lauk Pauk',
    },
  });

  const catMinuman = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Minuman Segar',
    },
  });

  console.log('Created categories');

  await prisma.menu.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        categoryId: catMakanan.id,
        name: 'Nasi Rames Padang',
        description: 'Nasi putih hangat dengan kuah gulai, daun singkong, sambal hijau, dan sambal merah.',
        price: 15000,
        imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catLauk.id,
        name: 'Rendang Sapi Istimewa',
        description: 'Daging sapi pilihan yang dimasak perlahan dengan santan dan bumbu rempah tradisional khas Minang.',
        price: 22000,
        imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catLauk.id,
        name: 'Ayam Pop Gurih',
        description: 'Ayam kampung rebus gurih disajikan dengan sambal merah kelapa khas ayam pop.',
        price: 18000,
        imageUrl: 'https://images.unsplash.com/photo-1626700051175-6518c4793f06?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catLauk.id,
        name: 'Dendeng Balado Batokok',
        description: 'Dendeng sapi garing yang ditumbuk kasar dengan lumuran sambal balado merah pedas manis.',
        price: 20000,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catMinuman.id,
        name: 'Es Teh Manis',
        description: 'Teh harum manis dingin.',
        price: 5000,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catMinuman.id,
        name: 'Es Jeruk Peras',
        description: 'Jeruk peras murni segar dengan gula sirup asli.',
        price: 8000,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: catMinuman.id,
        name: 'Jus Alpukat',
        description: 'Jus alpukat mentega segar dengan kental manis cokelat.',
        price: 12000,
        imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
    ],
  });

  console.log('Created menus');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
