import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clean the database
  await prisma.passwordResetToken.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deliveryIssue.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.product.deleteMany();
  await prisma.courierJob.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create Users
  const rahul = await prisma.user.create({
    data: { name: 'Rahul Kumar', email: 'rahul@iitk.ac.in', passwordHash, role: 'user', kartCoins: 150, address: 'Hall 2, Room 201', phone: '9876543210' }
  });
  const priya = await prisma.user.create({
    data: { name: 'Priya Singh', email: 'priya@iitk.ac.in', passwordHash, role: 'user', kartCoins: 220, address: 'Hall 5, Room 105', phone: '9876543211' }
  });
  const amit = await prisma.user.create({
    data: { name: 'Amit Sharma', email: 'amit@iitk.ac.in', passwordHash, role: 'user', kartCoins: 80, address: 'Hall 3, Room 302', phone: '9876543212' }
  });
  const neha = await prisma.user.create({
    data: { name: 'Neha Gupta', email: 'neha@iitk.ac.in', passwordHash, role: 'user', kartCoins: 340, address: 'Hall 7, Room 410', phone: '9876543213' }
  });

  // Admin
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@iitk.ac.in', passwordHash, role: 'admin' }
  });

  // 2. Create Vendors and linked Users
  const vendorsData = [
    { email: 'amul@iitk.ac.in', name: 'Amul Parlour', location: 'OAT' },
    { email: 'photocopy@iitk.ac.in', name: 'Photocopy Shop', location: 'Library' },
    { email: 'laundry@iitk.ac.in', name: 'Wash & Iron', location: 'Hall 1' },
    { email: 'bazaar@iitk.ac.in', name: 'Chhota Bazaar', location: 'Shopping Centre' },
    { email: 'nescafe@iitk.ac.in', name: 'Nescafe', location: 'Academic Area' },
    { email: 'kc@iitk.ac.in', name: 'KC Shop', location: 'Hall 3' }
  ];

  const vendorRecords = [];
  for (const v of vendorsData) {
    const user = await prisma.user.create({
      data: { name: v.name + ' Owner', email: v.email, passwordHash, role: 'vendor', phone: '9000000000' }
    });
    const vendor = await prisma.vendor.create({
      data: { userId: user.id, name: v.name, email: v.email, rating: 4.5, totalOrders: 100, totalEarnings: 50000, location: v.location, availability: '9 AM - 9 PM' }
    });
    vendorRecords.push(vendor);
  }

  // 3. Create Couriers and linked Users
  const couriersData = [
    { email: 'ravi@iitk.ac.in', name: 'Ravi Verma', totalDeliveries: 234 },
    { email: 'suresh@iitk.ac.in', name: 'Suresh Das', totalDeliveries: 156 }
  ];
  
  const courierRecords = [];
  for (const c of couriersData) {
    const user = await prisma.user.create({
      data: { name: c.name, email: c.email, passwordHash, role: 'courier', phone: '8000000000' }
    });
    const profile = await prisma.courierProfile.create({
      data: { userId: user.id, totalDeliveries: c.totalDeliveries, totalEarnings: c.totalDeliveries * 30, experience: '1 year', availability: 'Evening' }
    });
    courierRecords.push({ user, profile });
  }

  // 4. Create Products
  const categories = ['Food', 'Beverage', 'Printing', 'Laundry', 'Stationery'];
  const amul = vendorRecords.find(v => v.email === 'amul@iitk.ac.in')!;
  const photocopy = vendorRecords.find(v => v.email === 'photocopy@iitk.ac.in')!;
  
  const productsData = [
    { vendorId: amul.id, name: 'Amul Kool', category: 'Beverage', price: 25, description: 'Chilled flavoured milk', image: 'https://via.placeholder.com/150', inStock: true },
    { vendorId: amul.id, name: 'Cheese Sandwich', category: 'Food', price: 40, description: 'Grilled cheese sandwich', image: 'https://via.placeholder.com/150', inStock: true },
    { vendorId: amul.id, name: 'Butter Toast', category: 'Food', price: 20, description: 'Crispy buttered toast', image: 'https://via.placeholder.com/150', inStock: true },
    { vendorId: photocopy.id, name: 'A4 Print B/W', category: 'Printing', price: 2, description: 'Single side black and white print', image: 'https://via.placeholder.com/150', inStock: true },
    { vendorId: photocopy.id, name: 'A4 Print Color', category: 'Printing', price: 10, description: 'Color print', image: 'https://via.placeholder.com/150', inStock: true },
    { vendorId: photocopy.id, name: 'Spiral Binding', category: 'Stationery', price: 30, description: 'Up to 100 pages', image: 'https://via.placeholder.com/150', inStock: true },
    // Fill the rest up to 22 products
  ];

  // Adding more mock products
  for (let i = 6; i < 22; i++) {
    const v = vendorRecords[i % vendorRecords.length];
    productsData.push({
      vendorId: v.id,
      name: `Mock Product ${i+1}`,
      category: categories[i % categories.length],
      price: Math.floor(Math.random() * 200) + 10,
      description: 'Mock description for product',
      image: 'https://via.placeholder.com/150',
      inStock: true
    });
  }

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.create({ data: p });
    products.push(product);
  }

  // 5. Create Orders
  for (let i = 1; i <= 10; i++) {
    const user = i % 2 === 0 ? rahul : priya;
    const vendor = vendorRecords[i % vendorRecords.length];
    const vendorProducts = products.filter(p => p.vendorId === vendor.id);
    const p1 = vendorProducts[0];
    const p2 = vendorProducts[1] || vendorProducts[0];
    
    const courier = (i % 3 === 0) ? courierRecords[0].user : (i % 3 === 1 ? courierRecords[1].user : null);
    let status: 'pending' | 'accepted' | 'picked' | 'delivered' | 'cancelled' = 'delivered';
    if (!courier) status = 'pending';
    else if (i % 4 === 0) status = 'picked';
    else if (i % 5 === 0) status = 'accepted';

    const orderTotal = p1.price * 2 + p2.price * 1;
    
    const order = await prisma.order.create({
      data: {
        id: `ORD00${i}`,
        userId: user.id,
        vendorId: vendor.id,
        courierId: courier?.id,
        total: orderTotal,
        status: status,
        kartCoinsEarned: Math.floor(orderTotal * 0.1),
        deliveryAddress: user.address || 'Campus',
        paymentStatus: status === 'delivered' ? 'success' : 'pending',
        paymentMethod: 'UPI',
        items: {
          create: [
            { productId: p1.id, quantity: 2, price: p1.price },
            { productId: p2.id, quantity: 1, price: p2.price }
          ]
        }
      }
    });

    if (status === 'delivered') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: user.id,
          amount: orderTotal + 30,
          paymentStatus: 'success',
          method: 'UPI',
        }
      });
    }
  }

  // 6. Complaints & Delivery Issues
  const orders = await prisma.order.findMany();
  await prisma.complaint.create({
    data: { userId: rahul.id, orderId: orders[0].id, subject: 'Late Delivery', description: 'Order was 30 mins late', type: 'delivery', status: 'pending' }
  });
  await prisma.complaint.create({
    data: { userId: priya.id, orderId: orders[1].id, subject: 'Missing Item', description: 'Did not receive one item', type: 'order', status: 'resolved' }
  });

  await prisma.deliveryIssue.create({
    data: { orderId: orders[2].id, courierId: courierRecords[0].user.id, issueType: 'customer_unavailable', description: 'Student not answering phone', status: 'pending' }
  });
  await prisma.deliveryIssue.create({
    data: { orderId: orders[3].id, courierId: courierRecords[1].user.id, issueType: 'vehicle_breakdown', description: 'Cycle chain broke', status: 'resolved' }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
