import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { orderService } from '../services/orderService';

export const placeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { vendorId, items, deliveryAddress, paymentMethod } = req.body;
    
    const validatedVendorId = await orderService.validateSingleVendorCart(items);
    if (validatedVendorId !== vendorId) throw new AppError('Vendor mismatch', 400);

    const total = await orderService.calculateOrderTotal(items);
    const kartCoinsEarned = orderService.calculateKartCoins(total);

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        vendorId,
        total,
        deliveryAddress,
        paymentMethod,
        kartCoinsEarned,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: 0 // Simplified for logic scope
          }))
        }
      },
      include: { items: true }
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: req.user.id,
        amount: total + 30, // 30 is delivery charge
        paymentStatus: 'pending',
        method: paymentMethod
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { kartCoins: { increment: kartCoinsEarned } }
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, courier: true, items: { include: { product: true } } }
    });
    if (!order) return next(new AppError('Order not found', 404));
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });

    if (status === 'delivered') {
      await orderService.processOrderDelivery(order.id);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const assignCourier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courierId } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { courierId }
    });
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const rateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, rating, feedback } = req.body;
    const data: any = {};
    if (type === 'vendor') { data.vendorRating = rating; data.vendorFeedback = feedback; }
    else if (type === 'courier') { data.courierRating = rating; data.courierFeedback = feedback; }
    else if (type === 'product') { data.rating = rating; data.feedback = feedback; }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data
    });
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const submitComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subject, description, type } = req.body;
    const complaint = await prisma.complaint.create({
      data: {
        userId: req.user.id,
        orderId: req.params.id,
        subject,
        description,
        type
      }
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

export const getActiveOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['pending', 'accepted', 'picked'] } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};
