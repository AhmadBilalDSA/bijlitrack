/**
 * Masking utility for sensitive data
 */

export const maskString = (str: string, visiblePrefix = 2, visibleSuffix = 2) => {
  if (!str) return '';
  if (str.length <= visiblePrefix + visibleSuffix) return str;
  const prefix = str.slice(0, visiblePrefix);
  const suffix = str.slice(-visibleSuffix);
  const masked = '*'.repeat(str.length - visiblePrefix - visibleSuffix);
  return `${prefix}${masked}${suffix}`;
};

export const maskCNIC = (cnic: string) => {
  if (!cnic) return '';
  const parts = cnic.split('-');
  if (parts.length === 3) {
    return `${parts[0].slice(0, 2)}***-*******-${parts[2]}`;
  }
  return maskString(cnic, 2, 1);
};

export const maskAddress = (address: string) => {
  if (!address) return '';
  const words = address.split(' ');
  if (words.length > 2) {
    return `${words[0]} **** ${words[words.length - 1]}`;
  }
  return maskString(address, 3, 3);
};

export const maskSensitiveData = (data: any): any => {
  if (!data) return data;

  if (typeof data === 'object' && data.headers && Array.isArray(data.rows)) {
    const sensitiveIndices = data.headers
      .map((header: string, index: number) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('cnic')) return { index, type: 'cnic' };
        if (lowerHeader.includes('address')) return { index, type: 'address' };
        if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) return { index, type: 'phone' };
        if (
          lowerHeader.includes('name') &&
          !lowerHeader.includes('feeder') &&
          !lowerHeader.includes('station')
        )
          return { index, type: 'name' };
        return null;
      })
      .filter((item: any) => item !== null);

    const maskedRows = data.rows.map((row: any[]) => {
      const newRow = [...row];
      sensitiveIndices.forEach(({ index, type }: { index: number; type: string }) => {
        if (newRow[index]) {
          if (type === 'cnic') newRow[index] = maskCNIC(newRow[index]);
          else if (type === 'address') newRow[index] = maskAddress(newRow[index]);
          else if (type === 'phone') newRow[index] = maskString(newRow[index], 3, 2);
          else if (type === 'name') newRow[index] = maskString(newRow[index], 2, 1);
        }
      });
      return newRow;
    });

    return { ...data, rows: maskedRows };
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const maskedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('cnic') || lowerKey === 'nicno' || lowerKey.includes('_cnic')) {
        maskedObj[key] = maskCNIC(value as string);
      } else if (
        lowerKey.includes('address') ||
        lowerKey.startsWith('addr') ||
        lowerKey.includes('consumeraddress')
      ) {
        maskedObj[key] = maskAddress(value as string);
      } else if (
        lowerKey.includes('phone') ||
        lowerKey.includes('mobile') ||
        lowerKey === 'contactno' ||
        lowerKey === 'consumercontactno'
      ) {
        maskedObj[key] = maskString(value as string, 3, 2);
      } else if (
        lowerKey.includes('name') &&
        !lowerKey.includes('feeder') &&
        !lowerKey.includes('station')
      ) {
        maskedObj[key] = maskString(value as string, 2, 1);
      } else if (typeof value === 'object') {
        maskedObj[key] = maskSensitiveData(value);
      } else {
        maskedObj[key] = value;
      }
    }
    return maskedObj;
  }

  return data;
};
