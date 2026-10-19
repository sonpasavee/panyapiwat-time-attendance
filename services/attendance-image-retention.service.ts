import { deleteAttendanceImage } from "@/lib/cloudinary";
import {
  clearCheckInImage,
  clearCheckOutImage,
  countExpiredImagesWithoutPublicId,
  findExpiredCheckInImages,
  findExpiredCheckOutImages,
} from "@/repositories/attendance-image.repository";

const RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 300;
const CONCURRENCY = 10;

async function processImages<T>(
  images: T[],
  getImage: (image: T) => { id: string; publicId: string | null },
  clearImage: (id: string, publicId: string) => Promise<{ count: number }>,
) {
  let deleted = 0;
  let failed = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < images.length) {
      const image = images[nextIndex++];
      if (!image) return;

      const { id, publicId } = getImage(image);
      if (!publicId) continue;

      try {
        if (!(await deleteAttendanceImage(publicId))) {
          failed += 1;
          continue;
        }
        const cleared = await clearImage(id, publicId);
        if (cleared.count === 1) deleted += 1;
      } catch (error) {
        failed += 1;
        console.error("Failed to expire attendance image", {
          attendanceId: id,
          error,
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, images.length) },
      () => worker(),
    ),
  );

  return { deleted, failed };
}

export async function expireAttendanceImages(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
  const [checkIns, checkOuts, missingPublicId] = await Promise.all([
    findExpiredCheckInImages(cutoff),
    findExpiredCheckOutImages(cutoff),
    countExpiredImagesWithoutPublicId(cutoff),
  ]);

  const [checkInResult, checkOutResult] = await Promise.all([
    processImages(
      checkIns,
      (image) => ({ id: image.id, publicId: image.checkInImagePublicId }),
      clearCheckInImage,
    ),
    processImages(
      checkOuts,
      (image) => ({ id: image.id, publicId: image.checkOutImagePublicId }),
      clearCheckOutImage,
    ),
  ]);
  const deleted = checkInResult.deleted + checkOutResult.deleted;
  const failed = checkInResult.failed + checkOutResult.failed;

  return {
    cutoff: cutoff.toISOString(),
    processed: checkIns.length + checkOuts.length,
    deleted,
    failed,
    skippedWithoutPublicId: missingPublicId,
    hasMore: checkIns.length === BATCH_SIZE || checkOuts.length === BATCH_SIZE,
  };
}
