/**
 * Description Service
 * Manages Notion-like description documents
 */

import prisma from '../config/database';
import { DescriptionStatus } from '@prisma/client';

export class DescriptionService {
  /**
   * Get all descriptions (published only for non-admin)
   */
  async getAll(isAdmin: boolean = false) {
    const where = isAdmin ? {} : { status: DescriptionStatus.PUBLISHED };

    return await prisma.description.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Get description by ID
   */
  async getById(id: string, isAdmin: boolean = false) {
    const description = await prisma.description.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!description) {
      throw new Error('Description not found');
    }

    // Non-admin can only see published descriptions
    if (!isAdmin && description.status !== DescriptionStatus.PUBLISHED) {
      throw new Error('Description not found');
    }

    return description;
  }

  /**
   * Create new description
   */
  async create(data: {
    title: string;
    content: any;
    authorId: string;
  }) {
    return await prisma.description.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        status: DescriptionStatus.DRAFT,
        version: 1,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update description
   */
  async update(id: string, data: {
    title?: string;
    content?: any;
    authorId: string;
  }) {
    // Check ownership
    const existing = await prisma.description.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Description not found');
    }

    if (existing.authorId !== data.authorId) {
      throw new Error('Unauthorized');
    }

    return await prisma.description.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Publish description
   */
  async publish(id: string, authorId: string) {
    // Check ownership
    const existing = await prisma.description.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Description not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    // Save to history before publishing
    await prisma.descriptionHistory.create({
      data: {
        descriptionId: id,
        title: existing.title,
        content: existing.content,
        version: existing.version,
      },
    });

    // Update to published
    return await prisma.description.update({
      where: { id },
      data: {
        status: DescriptionStatus.PUBLISHED,
        publishedAt: new Date(),
        version: existing.version + 1,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Unpublish description (back to draft)
   */
  async unpublish(id: string, authorId: string) {
    // Check ownership
    const existing = await prisma.description.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Description not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    return await prisma.description.update({
      where: { id },
      data: {
        status: DescriptionStatus.DRAFT,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete description
   */
  async delete(id: string, authorId: string) {
    // Check ownership
    const existing = await prisma.description.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Description not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    await prisma.description.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get description history
   */
  async getHistory(id: string, authorId: string) {
    // Check ownership
    const description = await prisma.description.findUnique({
      where: { id },
    });

    if (!description) {
      throw new Error('Description not found');
    }

    if (description.authorId !== authorId) {
      throw new Error('Unauthorized');
    }

    return await prisma.descriptionHistory.findMany({
      where: { descriptionId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new DescriptionService();
