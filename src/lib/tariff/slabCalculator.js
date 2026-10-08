"use strict";
/**
 * NEPRA slab cliff calculator.
 *
 * Pure functions only — no React, no I/O — so the tariff maths is testable and
 * reusable from both the simulator UI and server-side advisory logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIXED_CHARGE_PKR = exports.GST_RATE = exports.SLAB_RATES = exports.DEFAULT_CYCLE_DAYS = exports.PROTECTED_SLAB_CEILING_UNITS = void 0;
exports.calculateProjectedUnits = calculateProjectedUnits;
exports.calculateTelescopicCost = calculateTelescopicCost;
exports.calculateProtectedCost = calculateProtectedCost;
exports.calculateUnprotectedCost = calculateUnprotectedCost;
exports.calculateJumpCost = calculateJumpCost;
exports.calculateSlabImpact = calculateSlabImpact;
exports.round2 = round2;
exports.getRiskZone = getRiskZone;
/** Consumers lose protected status when a billing cycle exceeds this ceiling. */
exports.PROTECTED_SLAB_CEILING_UNITS = 200;
exports.DEFAULT_CYCLE_DAYS = 30;
/**
 * Telescopic residential slab rates, PKR per kWh.
 *
 * PROTECTED: consumer retains the protected (lower) schedule up to the ceiling.
 * UNPROTECTED: the schedule a consumer is reclassified onto once the ceiling is
 * crossed, and the one non-protected consumers already pay.
 */
exports.SLAB_RATES = {
    protected: [
        { upTo: 100, rate: 10.54 },
        { upTo: 200, rate: 13.01 },
    ],
    unprotected: [
        { upTo: 100, rate: 22.44 },
        { upTo: 200, rate: 28.91 },
        { upTo: 300, rate: 33.1 },
    ],
};
/** GST applied to the recovery delta. */
exports.GST_RATE = 0.18;
/**
 * Standard monthly fixed charge (customer service charge) in PKR, levied per
 * sanctioned load. Doubles where more than one slab group is billed.
 */
exports.FIXED_CHARGE_PKR = 60;
/**
 * Projects end-of-cycle consumption from the run rate so far.
 * Guards against division by zero on day 0.
 */
function calculateProjectedUnits(currentUnits, daysElapsed, cycleDays = exports.DEFAULT_CYCLE_DAYS) {
    if (daysElapsed <= 0 || cycleDays <= 0) {
        return Math.max(0, currentUnits);
    }
    const dailyRate = currentUnits / daysElapsed;
    return round2(dailyRate * cycleDays);
}
/**
 * Telescopic cost of `units` across a slab schedule. Each slab is charged only
 * on the units falling inside it.
 */
function calculateTelescopicCost(units, schedule) {
    if (units <= 0)
        return 0;
    let cost = 0;
    let previousCap = 0;
    for (const slab of schedule) {
        const unitsInSlab = Math.min(units, slab.upTo) - previousCap;
        if (unitsInSlab > 0) {
            cost += unitsInSlab * slab.rate;
        }
        previousCap = slab.upTo;
        if (units <= slab.upTo)
            break;
    }
    // Units beyond the last modelled slab are charged at the final slab's rate.
    if (units > previousCap) {
        const finalRate = schedule[schedule.length - 1].rate;
        cost += (units - previousCap) * finalRate;
    }
    return cost;
}
function calculateProtectedCost(units) {
    return calculateTelescopicCost(units, exports.SLAB_RATES.protected);
}
function calculateUnprotectedCost(units) {
    return calculateTelescopicCost(units, exports.SLAB_RATES.unprotected);
}
/**
 * Cost of reclassifying a consumer from the protected to the unprotected
 * schedule, inclusive of GST on the delta and the fixed-charge step.
 *
 * The reclassification applies to the whole cycle, not just the units above
 * 200, so the penalty is priced across the full projected consumption.
 */
function calculateJumpCost(projectedUnits) {
    if (projectedUnits <= exports.PROTECTED_SLAB_CEILING_UNITS)
        return 0;
    const protectedCost = calculateProtectedCost(projectedUnits);
    const unprotectedCost = calculateUnprotectedCost(projectedUnits);
    const delta = unprotectedCost - protectedCost;
    const gstOnDelta = delta * exports.GST_RATE;
    const fixedChargeDelta = exports.FIXED_CHARGE_PKR;
    return round2(delta + gstOnDelta + fixedChargeDelta);
}
/**
 * Projects the ceiling position for a consumer.
 *
 * `daysRemaining` is optional so the two-argument form in the spec keeps
 * working; it is required for an accurate daily budget, since the safe daily
 * allowance is the remaining headroom divided by the days left to spend it.
 */
function calculateSlabImpact(projectedUnits, isCurrentlyProtected, daysRemaining = 0) {
    const projectedTotal = Math.max(0, round2(projectedUnits));
    const crossesCliff = isCurrentlyProtected && projectedTotal > exports.PROTECTED_SLAB_CEILING_UNITS;
    // A consumer who is not protected has no ceiling headroom worth protecting.
    const unitsUntilCliff = isCurrentlyProtected
        ? Math.max(0, round2(exports.PROTECTED_SLAB_CEILING_UNITS - projectedTotal))
        : 0;
    const dailySafeBudgetUnits = isCurrentlyProtected && daysRemaining > 0
        ? round2(unitsUntilCliff / daysRemaining)
        : 0;
    return {
        projectedTotal,
        isAtRisk: crossesCliff,
        unitsUntilCliff,
        estimatedJumpCostPkr: crossesCliff ? calculateJumpCost(projectedTotal) : 0,
        dailySafeBudgetUnits,
    };
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
/**
 * Colour bands for the progress gauge. The amber band starts at 160 rather
 * than exactly at the ceiling so a consumer still under 200 gets a warning
 * before it is too late to course-correct.
 */
function getRiskZone(units) {
    if (units >= exports.PROTECTED_SLAB_CEILING_UNITS)
        return 'critical';
    if (units >= 160)
        return 'warning';
    return 'safe';
}
