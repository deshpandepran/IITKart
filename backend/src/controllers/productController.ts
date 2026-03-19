import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();



/*-----------------------------------------------
creating products by authorized vendors
------------------------------------------------*/
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, price, description, stock } = req.body;

    // find vendor profile of logged-in user
    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        userId: 1, //userId: (req as any).user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // create product
    const product = await prisma.product.create({
      data: {
        name,
        price,
        description,
        stock,
        vendorId: vendor.id,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product" });
  }
};


/*-----------------------------------------------
view all the products in the shop for authorized vendors
------------------------------------------------*/
export const getVendorProducts = async (req: any, res: any) => {
  try {
    // find vendor profile
    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // get products
    const products = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching products" });
  }
};


/*-----------------------------------------------
updating products by authorized users only
------------------------------------------------*/
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const { name, price, description, stock } = req.body;

    // 1. Get vendor profile of logged-in user
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // 2. Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 3. Ownership check
    if (product.vendorId !== vendor.id) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }

    // 4. Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        price,
        description,
        stock,
      },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
};


/*-----------------------------------------------
deleting products by authorized users only
------------------------------------------------*/
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = Number(req.params.id);

    // 1. Get vendor profile
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // 2. Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 3. Ownership check
    if (product.vendorId !== vendor.id) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }

    // 4. Delete product
    await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};

/*-----------------------------------------------
get products by consumers only
------------------------------------------------*/
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true,
        vendor: {
          isOpen: true,
        },
      },
      include: {
        vendor: {
          select: {
            shopName: true,
            shopType: true,
          },
        },
      },
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
};