import { prisma } from "@/lib/db";

const BATCH_SIZE = 300;

export async function findExpiredCheckInImages(cutoff: Date) {
  return prisma.attendance.findMany({
    where: {
      checkInAt: { lte: cutoff },
      checkInImagePublicId: { not: null },
    },
    select: { id: true, checkInImagePublicId: true },
    orderBy: { checkInAt: "asc" },
    take: BATCH_SIZE,
  });
}

export async function findExpiredCheckOutImages(cutoff: Date) {
  return prisma.attendance.findMany({
    where: {
      checkOutAt: { lte: cutoff },
      checkOutImagePublicId: { not: null },
    },
    select: { id: true, checkOutImagePublicId: true },
    orderBy: { checkOutAt: "asc" },
    take: BATCH_SIZE,
  });
}

export async function clearCheckInImage(id: string, publicId: string) {
  return prisma.attendance.updateMany({
    where: { id, checkInImagePublicId: publicId },
    data: { checkInPhotoUrl: null, checkInImagePublicId: null },
  });
}

export async function clearCheckOutImage(id: string, publicId: string) {
  return prisma.attendance.updateMany({
    where: { id, checkOutImagePublicId: publicId },
    data: { checkOutPhotoUrl: null, checkOutImagePublicId: null },
  });
}

export async function countExpiredImagesWithoutPublicId(cutoff: Date) {
  const [checkIn, checkOut] = await Promise.all([
    prisma.attendance.count({
      where: {
        checkInAt: { lte: cutoff },
        checkInPhotoUrl: { not: null },
        checkInImagePublicId: null,
      },
    }),
    prisma.attendance.count({
      where: {
        checkOutAt: { lte: cutoff },
        checkOutPhotoUrl: { not: null },
        checkOutImagePublicId: null,
      },
    }),
  ]);

  return checkIn + checkOut;
}
