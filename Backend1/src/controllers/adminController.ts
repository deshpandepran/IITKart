import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { exportToCSV, paginateQuery } from '../utils/helpers';

export const getPlatformStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalOrders = await prisma.order.count();
    const result = await prisma.order.aggregate({ _sum: { total: true } });
    const totalRevenue = result._sum.total || 0;
    const activeUsers = await prisma.user.count({ where: { status: 'active', role: 'user' } });
    const activeVendors = await prisma.vendor.count({ where: { status: 'active' } });
    const pendingComplaints = await prisma.complaint.count({ where: { status: 'pending' } });
    const totalProducts = await prisma.product.count();

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } }, vendor: { select: { name: true } } }
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders, totalRevenue, activeUsers, activeVendors, pendingComplaints,
        totalProducts, recentOrders, revenueByDay: [] // Placeholder
      }
    });
  } catch (error) { next(error); }
};

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;
    const { skip, take } = paginateQuery(Number(page), Number(limit));

    const where: any = {};
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take,
        include: { _count: { select: { ordersAsUser: true } } }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
};

export const banUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return next(new AppError('User not found', 404));
    
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: newStatus }
    });
    res.status(200).json({ success: true, data: updated, message: `User ${newStatus}` });
  } catch (error) { next(error); }
};

export const listVendors = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, status } = req.query;
    const where: any = {};
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (status) where.status = status;

    const vendors = await prisma.vendor.findMany({
      where,
      include: { _count: { select: { products: true } } }
    });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

export const toggleVendorStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) return next(new AppError('Vendor not found', 404));
    
    const newStatus = vendor.status === 'active' ? 'suspended' : 'active';
    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: newStatus }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // Limits for simplicity
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const forceUpdateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const getComplaints = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaints = await prisma.complaint.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) { next(error); }
};

export const resolveComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: { status: 'resolved' }
    });
    res.status(200).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

export const getDeliveryIssues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const issues = await prisma.deliveryIssue.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ success: true, data: issues });
  } catch (error) { next(error); }
};

export const updateDeliveryIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, resolutionNotes } = req.body;
    const issue = await prisma.deliveryIssue.update({
      where: { id: req.params.id },
      data: { status, resolutionNotes }
    });
    res.status(200).json({ success: true, data: issue });
  } catch (error) { next(error); }
};

export const exportUsersCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } });
    const csv = exportToCSV(users, 'users');
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (error) { next(error); }
};

export const exportVendorsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany();
    const csv = exportToCSV(vendors, 'vendors');
    res.header('Content-Type', 'text/csv');
    res.attachment('vendors.csv');
    res.send(csv);
  } catch (error) { next(error); }
};

export const exportOrdersCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany();
    const csv = exportToCSV(orders, 'orders');
    res.header('Content-Type', 'text/csv');
    res.attachment('orders.csv');
    res.send(csv);
  } catch (error) { next(error); }
};
