import prisma from './src/config/db';
import { orderService } from './src/services/orderService';

async function runTest() {
  try {
    console.log("Setting up test data...");
    
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: `testuser-${Date.now()}@example.com`,
        passwordHash: "hash",
        role: "user"
      }
    });

    const vendorUser = await prisma.user.create({
      data: {
        name: "Test Vendor",
        email: `testvendor-${Date.now()}@example.com`,
        passwordHash: "hash",
        role: "vendor"
      }
    });

    const vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        name: "Test Vendor Store",
        email: vendorUser.email,
        totalEarnings: 0
      }
    });

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: "Test Product",
        category: "Test",
        price: 100,
        description: "Test",
        image: "test.jpg"
      }
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        vendorId: vendor.id,
        total: 100,
        deliveryAddress: "Test Address",
        paymentMethod: "COD",
        status: "pending"
      }
    });

    console.log(`Created Order ${order.id} for Vendor ${vendor.id} (Total: 100)`);
    
    console.log("Processing delivery (1st time)...");
    await orderService.processOrderDelivery(order.id);
    
    let updatedVendor = await prisma.vendor.findUnique({ where: { id: vendor.id } });
    console.log(`Vendor earnings after 1st call (Expected 90): ${updatedVendor?.totalEarnings}`);
    if (updatedVendor?.totalEarnings !== 90) throw new Error("Earnings calculation failed");

    console.log("Processing delivery (2nd time) - Testing idempotency...");
    await orderService.processOrderDelivery(order.id);
    
    updatedVendor = await prisma.vendor.findUnique({ where: { id: vendor.id } });
    console.log(`Vendor earnings after 2nd call (Expected 90): ${updatedVendor?.totalEarnings}`);
    if (updatedVendor?.totalEarnings !== 90) throw new Error("Idempotency failed (earnings incremented again)");

    const transactions = await prisma.earningsTransaction.findMany({ where: { orderId: order.id } });
    console.log(`Transactions found (Expected 1): ${transactions.length}`);
    if (transactions.length !== 1) throw new Error("Transaction count mismatch");

    console.log("TEST PASSED SUCCESSFULLY!");

    await prisma.earningsTransaction.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    await prisma.vendor.deleteMany({ where: { id: vendor.id } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, vendorUser.id] } } });

  } catch (error) {
    console.error("TEST FAILED:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
