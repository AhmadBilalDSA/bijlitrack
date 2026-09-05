import * as cheerio from 'cheerio';

export const COMPLAINT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

export const parseComplaintTable = (html: string) => {
  const $ = cheerio.load(html);
  const complaints: any[] = [];

  $('table#dynamic-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 7) return;

    const ticketNo = $(cells[0]).text().trim();
    const statusBadge = $(cells[1]).find('.badge').first().text().trim();
    const reopened = $(cells[1]).text().includes('Reopened');
    const refNo = $(cells[2]).text().trim();
    const nature = $(cells[3]).text().trim();
    const type = $(cells[4]).text().trim();
    const source = $(cells[5]).text().trim();
    const feedback = $(cells[6]).find('.badge').text().trim();

    const historyHtml = $(cells[7]).html() || '';
    const historyEntries: string[] = [];
    const historyParts = historyHtml.split('<br>');
    for (const part of historyParts) {
      const clean = cheerio.load(part).text().trim();
      if (clean) historyEntries.push(clean);
    }

    complaints.push({
      ticketNo,
      status: statusBadge,
      reopened,
      refNo,
      nature,
      type,
      source,
      feedback,
      history: historyEntries,
    });
  });

  return complaints;
};
