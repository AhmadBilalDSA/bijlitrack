/**
 * CCMS Service - Real-time Data Fetcher
 * Fetches data from public CCMS PITC APIs.
 */

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://ccms.pitc.com.pk',
  Referer: 'https://ccms.pitc.com.pk/',
  'X-Requested-With': 'XMLHttpRequest',
};

export const safeFetchJson = async (url: string): Promise<{ data: any; status: number }> => {
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(
      `CCMS returned HTML instead of JSON (status: ${res.status}). The server may be blocking requests from this IP/region.`
    );
  }

  try {
    return { data: JSON.parse(text), status: res.status };
  } catch (e: any) {
    throw new Error(`Invalid JSON response from CCMS (status: ${res.status}): ${text.substring(0, 100)}`);
  }
};

export const parseLoadInfo = (feederData: any, feederMeta?: any) => {
  const result: any = {
    feederCode: feederData.feeder_code || null,
    feederName: feederData.feeder || null,
    gridStation: feederData.grid || null,
    currentStatus: feederData.current_status || null,
    currentStatusTime: feederData.current_status_time || null,
    expectedRestorationTime: feederMeta?.time || feederData.expected_restoration_time || null,
    expectedRestorationDate: feederMeta?.date || null,
    expectedRestorationDuration: feederMeta?.duration || null,
    voltage: feederData.voltage || 0,
    current: feederData.current || 0,
    activePower: feederData.active_power_kW || 0,
    powerFactor: feederData.power_factor || 0,
    eventLogs: feederData.event_logs || [],
    days: {},
    todaySchedule: feederData.maintenance_sch || [],
    tripping: feederData.tripping || [],
  };

  if (feederData.history_data) {
    for (const [key, values] of Object.entries(feederData.history_data)) {
      const dateStr = key.replace('dt_', '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? (values as number[]) : [];
      const totalOutageMinutes = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      result.days[date] = {
        date,
        hourlyOutageMinutes: hourlyMinutes,
        totalOutageMinutes,
        totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
        hourlyStatus: hourlyMinutes.map((mins) => {
          if (mins === 0) return 'ON';
          if (mins >= 60) return 'OFF';
          return 'PARTIAL';
        }),
        scheduledMinutes: [],
        scheduledOutageMinutes: 0,
      };
    }
  }

  if (feederData.maintenance_data) {
    for (const [key, values] of Object.entries(feederData.maintenance_data)) {
      const dateStr = key.replace('dt_', '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? (values as number[]) : [];
      const totalScheduled = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      if (result.days[date]) {
        result.days[date].scheduledMinutes = hourlyMinutes;
        result.days[date].scheduledOutageMinutes = totalScheduled;
      } else {
        result.days[date] = {
          date,
          hourlyOutageMinutes: new Array(24).fill(0),
          totalOutageMinutes: 0,
          totalOutageHours: 0,
          hourlyStatus: new Array(24).fill('ON'),
          scheduledMinutes: hourlyMinutes,
          scheduledOutageMinutes: totalScheduled,
        };
      }
    }
  }

  return result;
};

export const fetchLoadInfo = async (referenceNo: string) => {
  const result: {
    success: boolean;
    referenceNo: string;
    timestamp: string;
    data: any;
    error: string | null;
  } = {
    success: false,
    referenceNo,
    timestamp: new Date().toISOString(),
    data: null,
    error: null,
  };

  const start = Date.now();

  try {
    console.log(`[CCMS] Fetching load info for ${referenceNo}...`);
    const { data: json, status } = await safeFetchJson(`https://ccms.pitc.com.pk/get-loadinfo/${referenceNo}`);
    console.log(`[CCMS] Load info fetched (${Date.now() - start}ms) - Status: ${status}`);

    if (json.message !== 'Success' || !json.load?.[0]?.response?.data?.[0]) {
      throw new Error(json.message || 'Load info not found');
    }

    const feederData = json.load[0].response.data[0];
    result.data = parseLoadInfo(feederData, json.feeder || null);
    result.success = true;

    return result;
  } catch (err: any) {
    console.error(`[CCMS] Load info error for ${referenceNo} (${Date.now() - start}ms):`, err.message);
    result.error = err.message;
    return result;
  }
};

export const fetchAllDetails = async (referenceNo: string) => {
  const result: {
    success: boolean;
    referenceNo: string;
    timestamp: string;
    user: any;
    bill: any;
    schedule: any;
    loadInfo: any;
    error: string | null;
  } = {
    success: false,
    referenceNo,
    timestamp: new Date().toISOString(),
    user: null,
    bill: null,
    schedule: null,
    loadInfo: null,
    error: null,
  };

  const totalStart = Date.now();

  try {
    console.log(`[CCMS] Fetching user details for ${referenceNo}...`);
    let start = Date.now();
    const { data: userData, status: userStatus } = await safeFetchJson(
      `https://ccms.pitc.com.pk/api/details/user?reference=${referenceNo}`
    );
    console.log(`[CCMS] User details fetched (${Date.now() - start}ms) - Status: ${userStatus}`);

    if (userData.message === 'Success') {
      result.user = userData.user;
    } else {
      throw new Error(userData.message || 'User details not found');
    }

    console.log(`[CCMS] Fetching bill details for ${referenceNo}...`);
    start = Date.now();
    const { data: billData, status: billStatus } = await safeFetchJson(
      `https://ccms.pitc.com.pk/api/details/bill?reference=${referenceNo}`
    );
    console.log(`[CCMS] Bill details fetched (${Date.now() - start}ms) - Status: ${billStatus}`);

    if (billData.bill) {
      result.bill = billData.bill;
    }

    console.log(`[CCMS] Fetching load info for ${referenceNo}...`);
    start = Date.now();
    const { data: loadJson, status: loadStatus } = await safeFetchJson(
      `https://ccms.pitc.com.pk/get-loadinfo/${referenceNo}`
    );
    console.log(`[CCMS] Load info fetched (${Date.now() - start}ms) - Status: ${loadStatus}`);

    if (loadJson.message === 'Success' && loadJson.load?.[0]?.response?.data?.[0]) {
      const feederData = loadJson.load[0].response.data[0];
      result.loadInfo = parseLoadInfo(feederData, loadJson.feeder || null);
      result.schedule = result.loadInfo;
    }

    result.success = true;
    console.log(`[CCMS] All data fetched for ${referenceNo} (total: ${Date.now() - totalStart}ms)`);
    return result;
  } catch (err: any) {
    console.error(`[CCMS] API fetch error for ${referenceNo} (total: ${Date.now() - totalStart}ms):`, err.message);
    result.error = err.message;
    return result;
  }
};
