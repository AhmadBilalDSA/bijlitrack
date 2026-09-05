import { ConsumerSnapshot, BillHistory, OutageHistory } from '../models';
import { fetchAllDetails, fetchLoadInfo } from './ccms.service';

/**
 * Save outage records for all available days from parsed load info
 */
export const saveOutageRecords = async (reference: any, userId: string, loadInfo: any) => {
  const promises = [];

  if (loadInfo.days) {
    for (const [dateStr, dayData] of Object.entries<any>(loadInfo.days)) {
      const dayDate = new Date(dateStr + 'T00:00:00');
      const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);

      promises.push(
        OutageHistory.findOneAndUpdate(
          {
            referenceId: reference._id,
            date: { $gte: dayDate, $lt: nextDay },
          },
          {
            userId: userId,
            referenceId: reference._id,
            feederCode: loadInfo.feederCode,
            feederName: loadInfo.feederName,
            date: dayDate,
            feederStatus: loadInfo.currentStatus,
            hourlyOutageMinutes: dayData.hourlyOutageMinutes,
            hourlyStatus: dayData.hourlyStatus,
            scheduledMinutes: dayData.scheduledMinutes || [],
            totalOutageMinutes: dayData.totalOutageMinutes,
            actualOutageHours: dayData.totalOutageHours,
            scheduledOutageHours: parseFloat(((dayData.scheduledOutageMinutes || 0) / 60).toFixed(2)),
            scrapedAt: new Date(),
          },
          { upsert: true }
        )
      );
    }
  }

  if (loadInfo.eventLogs && loadInfo.eventLogs.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    promises.push(
      OutageHistory.findOneAndUpdate(
        { referenceId: reference._id, date: { $gte: today, $lt: tomorrow } },
        { $set: { eventLogs: loadInfo.eventLogs } },
        { upsert: false }
      )
    );
  }

  await Promise.all(promises);
  console.log(`[Sync] Saved outage records for ${Object.keys(loadInfo.days || {}).length} days for ${reference.referenceNo}`);
};

/**
 * Synchronize ALL reference data from CCMS (user, bill, load info)
 */
export const performSync = async (reference: any, userId: string) => {
  console.log(`[Sync] Starting full sync for ${reference.referenceNo} (refId: ${reference._id})`);
  const startTime = Date.now();

  const data = await fetchAllDetails(reference.referenceNo);
  if (!data.success) {
    console.error(`[Sync] CCMS fetch failed for ${reference.referenceNo}: ${data.error}`);
    throw new Error(data.error || 'Failed to fetch latest data');
  }

  // 1. Save Snapshot
  const snapshot = new ConsumerSnapshot({
    userId: userId,
    referenceId: reference._id,
    consumerInfo: data.user,
    billingInfo: data.bill,
    feederInfo: data.loadInfo
      ? {
          code: data.loadInfo.feederCode,
          name: data.loadInfo.feederName,
          grid: data.loadInfo.gridStation,
        }
      : null,
    loadManagementInfo: data.loadInfo,
    outageInfo: data.loadInfo,
    scrapedAt: new Date(),
  });
  await snapshot.save();

  // 2. Sync Bill History
  if (data.bill?.histInfo) {
    const hist = data.bill.histInfo;
    const historyPromises = [];
    for (let i = 1; i <= 13; i++) {
      const month = hist[`gbHistMM${i}`];
      const amount = hist[`gbHistAssment${i}`];
      const payment = hist[`payment${i}`];
      if (month) {
        historyPromises.push(
          BillHistory.findOneAndUpdate(
            { referenceId: reference._id, billMonth: month },
            {
              userId: userId,
              amountDue: parseFloat(amount) || 0,
              status: payment ? 'Paid' : 'Unpaid',
              scrapedAt: new Date(),
            },
            { upsert: true }
          )
        );
      }
    }
    await Promise.all(historyPromises);
  }

  // 3. Save Outage Data
  if (data.loadInfo) {
    await saveOutageRecords(reference, userId, data.loadInfo);

    if (data.loadInfo.feederCode && !reference.feederCode) {
      reference.feederCode = data.loadInfo.feederCode;
    }
  }

  reference.lastCheckedAt = new Date();
  await reference.save();

  const duration = Date.now() - startTime;
  console.log(`[Sync] Full sync completed for ${reference.referenceNo} (${duration}ms)`);

  return snapshot;
};

/**
 * Track outages only - lightweight sync job
 */
export const performOutageSync = async (reference: any, userId: string) => {
  console.log(`[Sync] Starting outage-only sync for ${reference.referenceNo}`);
  const startTime = Date.now();

  const data = await fetchLoadInfo(reference.referenceNo);

  if (!data.success) {
    console.error(`[Sync] Outage fetch failed for ${reference.referenceNo}: ${data.error}`);
    throw new Error(data.error || 'Failed to fetch outage data');
  }

  await saveOutageRecords(reference, userId, data.data);

  if (data.data.feederCode && !reference.feederCode) {
    reference.feederCode = data.data.feederCode;
  }

  reference.lastCheckedAt = new Date();
  await reference.save();

  const duration = Date.now() - startTime;
  console.log(
    `[Sync] Outage sync completed for ${reference.referenceNo} (${duration}ms) - Status: ${data.data.currentStatus}`
  );

  return data.data;
};
