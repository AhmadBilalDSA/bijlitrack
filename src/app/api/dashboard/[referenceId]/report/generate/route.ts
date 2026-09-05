import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import {
  Reference,
  BillHistory,
  OutageHistory,
  ConsumerSnapshot,
  AnalysisReport,
} from '@/lib/server/models';
import { verifyAuth } from '@/lib/server/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  try {
    const authUser = verifyAuth(req);
    await connectDB();

    const { referenceId } = await params;

    const reference = await Reference.findOne({ _id: referenceId, userId: authUser.id });
    if (!reference) {
      return NextResponse.json(
        { message: 'Reference not found or not authorized' },
        { status: 404 }
      );
    }

    // Check daily limit: 2 reports per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReportCount = await AnalysisReport.countDocuments({
      userId: authUser.id,
      generatedAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (todayReportCount >= 2) {
      return NextResponse.json(
        {
          message:
            'Daily limit reached. You can generate up to 2 reports per day. Try again tomorrow.',
        },
        { status: 429 }
      );
    }

    const [billHistory, outageHistory, latestSnapshot] = await Promise.all([
      BillHistory.find({ referenceId: reference._id })
        .sort({ billMonth: -1 })
        .limit(13)
        .lean(),
      OutageHistory.find({ referenceId: reference._id })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      ConsumerSnapshot.findOne({ referenceId: reference._id })
        .sort({ scrapedAt: -1 })
        .lean(),
    ]);

    const billSummary = billHistory.map((b) => ({
      month: b.billMonth,
      amount: b.amountDue,
      status: b.status,
    }));

    const outageSummary = outageHistory.map((o) => ({
      date: new Date(o.date).toISOString().split('T')[0],
      totalMinutes: o.totalOutageMinutes,
      hours: o.actualOutageHours,
    }));

    const feederInfo =
      latestSnapshot?.outageInfo || latestSnapshot?.loadManagementInfo || {};
    const consumerInfo = latestSnapshot?.consumerInfo || {};
    const billingInfo = latestSnapshot?.billingInfo?.basicInfo || {};

    const prompt = `You are an electricity consumption analyst for Pakistani consumers. Analyze this data and provide a SHORT, actionable report.

CONSUMER: ${consumerInfo.NAME || 'Unknown'} | Tariff: ${consumerInfo.TARIFF || 'N/A'} | Load: ${consumerInfo.SLOAD || 'N/A'} kW
FEEDER: ${feederInfo.feederName || 'N/A'} | Grid: ${feederInfo.gridStation || 'N/A'} | Voltage: ${feederInfo.voltage || 0}kV | PF: ${feederInfo.powerFactor || 0}%
CURRENT BILL: Rs.${billingInfo.netBill || 0} | Units: ${billingInfo.totCurCons || billingInfo.totConsum || 0} kWh | Due: ${billingInfo.billDueDate || 'N/A'}

BILL HISTORY (last 12 months): ${JSON.stringify(billSummary)}

OUTAGE HISTORY (last 30 days): ${JSON.stringify(outageSummary)}

Respond in EXACTLY this JSON format (no markdown, no code blocks, just raw JSON):
{
  "summary": "2-3 sentence executive summary of their electricity situation",
  "billingInsights": ["insight 1", "insight 2", "insight 3"],
  "outageInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}

Keep each insight/recommendation under 20 words. Be specific with numbers. Focus on patterns and anomalies.`;

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            'AI report service is not configured. Set GROQ_API_KEY in environment variables.',
        },
        { status: 503 }
      );
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[Report] Groq API error (${aiResponse.status}): ${errText}`);
      return NextResponse.json(
        { message: 'AI service temporarily unavailable. Try again.' },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
    } catch {
      console.error('[Report] Failed to parse AI response:', aiContent);
      return NextResponse.json(
        { message: 'Failed to parse AI report. Try again.' },
        { status: 500 }
      );
    }

    const report = new AnalysisReport({
      userId: authUser.id,
      referenceId: reference._id,
      reportType: 'daily',
      summary: parsed.summary || 'Report generated.',
      billingInsights: parsed.billingInsights || [],
      outageInsights: parsed.outageInsights || [],
      recommendations: parsed.recommendations || [],
      generatedAt: new Date(),
    });
    await report.save();

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    const status = error.message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: error.message || 'Error generating report' },
      { status }
    );
  }
}
