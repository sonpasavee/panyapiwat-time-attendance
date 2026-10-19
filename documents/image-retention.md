# Attendance image retention

Check-in and check-out images are hidden in the application after 7 days. The Cloudinary deletion job is configured in `vercel.json` to run daily at 17:00 UTC (midnight in Thailand):

```text
GET /api/cron/expire-attendance-images
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` to a random secret of at least 32 bytes in Vercel Project Settings → Environment Variables for Production (and Preview if desired). Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>` when invoking a cron route. Keep it in Vercel's secret manager; do not commit its value.

The job deletes each Cloudinary asset first and then clears its URL and public ID from PostgreSQL. Failed deletions remain available for retry on the next run. Each run processes up to 300 check-in images and 300 check-out images with limited concurrency, which covers a cohort of about 250 students. If a batch fills up, the next daily run continues with remaining expired records.

Vercel Hobby only permits one cron invocation per day, and may invoke it within the configured hour. Therefore an image can remain in Cloudinary for almost another day after its 7-day expiration time, although the application hides it at the 7-day mark. Upgrade to Pro if the customer requires hourly physical deletion.

The admin attendance list and detail view show “รูปหมดอายุแล้ว” and do not link expired photos. Attendance, notes, and money records remain unchanged.

Expired legacy records without a Cloudinary public ID cannot be safely deleted automatically. The endpoint reports their count as `skippedWithoutPublicId` for separate review.
