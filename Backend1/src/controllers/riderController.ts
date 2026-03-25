import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationService } from '../services/notificationService';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.courierProfile.findUnique({ where: { userId: req.user.id } });
    res.status(200).json({ success: true, data: profile });
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { experience, availability, lookingForJob } = req.body;
    const profile = await prisma.courierProfile.update({
      where: { userId: req.user.id },
      data: { experience, availability, lookingForJob }
    });
    res.status(200).json({ success: true, data: profile });
  } catch (error) { next(error); }
};

export const getPendingDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'accepted', courierId: null },
      include: { vendor: { select: { name: true, location: true } }, items: true }
    });
    const formatted = orders.map(o => ({
      ...o,
      estimatedEarnings: Math.floor(o.total * 0.15) + 20,
      itemCount: o.items.reduce((acc, item) => acc + item.quantity, 0)
    }));
    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

export const acceptDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, status: 'accepted', courierId: null }
    });
    if (!order) return next(new AppError('Delivery no longer available', 404));

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { courierId: req.user.id, status: 'picked' }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const rejectDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Usually means un-assigning if already picked or just hiding from this courier
    // In our simplified logic, just return success if we want to dismiss it from UI
    res.status(200).json({ success: true, message: 'Delivery rejected' });
  } catch (error) { next(error); }
};

export const markDelivered = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, courierId: req.user.id, status: 'picked' }
    });
    if (!order) return next(new AppError('Invalid order state or unauthorized', 400));

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'delivered', paymentStatus: order.paymentMethod === 'Cash on Delivery' ? 'success' : order.paymentStatus }
    });

    const earnings = Math.floor(order.total * 0.15) + 20;

    await prisma.courierProfile.update({
      where: { userId: req.user.id },
      data: {
        totalDeliveries: { increment: 1 },
        totalEarnings: { increment: earnings }
      }
    });

    await prisma.vendor.update({
      where: { id: order.vendorId },
      data: { totalOrders: { increment: 1 }, totalEarnings: { increment: order.total } }
    });

    // Notify User
    const user = await prisma.user.findUnique({ where: { id: order.userId } });
    if (user) await notificationService.sendOrderStatusUpdate(user.email, order.id, 'delivered');

    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getActiveDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'picked' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const getDeliveryHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'delivered' },
      orderBy: { updatedAt: 'desc' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const getEarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.courierProfile.findUnique({ where: { userId: req.user.id } });
    const completedDeliveries = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'delivered' },
      select: { id: true, vendor: { select: { location: true } }, deliveryAddress: true, total: true, updatedAt: true }
    });
    
    const formattedDeliveries = completedDeliveries.map(d => ({
      orderId: d.id,
      from: d.vendor.location,
      to: d.deliveryAddress,
      earnings: Math.floor(d.total * 0.15) + 20,
      date: d.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: profile?.totalEarnings || 0,
        todayEarnings: 0, // Placeholder
        weekEarnings: 0, // Placeholder
        totalDeliveries: profile?.totalDeliveries || 0,
        completedDeliveries: formattedDeliveries
      }
    });
  } catch (error) { next(error); }
};

export const reportIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId, issueType, description } = req.body;
    const issue = await prisma.deliveryIssue.create({
      data: { orderId, courierId: req.user.id, issueType, description }
    });
    res.status(201).json({ success: true, data: issue });
  } catch (error) { next(error); }
};

export const getCourierJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.courierJob.findMany({
      where: { isAvailable: true },
      include: { vendor: { select: { name: true, location: true } } }
    });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) { next(error); }
};
