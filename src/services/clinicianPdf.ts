// Clinician PDF — chart dashboard + full-detail pages.
//
// Research-grounded design (product-brainstorming session, 2026-07-16 — see clinicianCharts.ts
// for the data-shaping rationale). Key decisions this file encodes:
//  - Overview -> full detail hierarchy (ProSPER three-tier pattern): a one-glance chart dashboard
//    up front, then the existing full prose report on the pages that follow — not a replacement
//    for it. Time-pressured clinicians scan the dashboard; the detail is there if they need it.
//  - Every chart is paired with the actual current number in text, never left to be read off the
//    line alone (graphs are faster for trends but worse than a plain number for a single value).
//  - Any series without enough distinct days (see MIN_TREND_POINTS in clinicianCharts.ts) renders
//    an explicit "not enough data yet" state instead of a line that implies a trend that isn't there.
//  - No risk gauge / risk-factor-bars section (2026-07-16 redesign): a gauge is a more prominent,
//    more verdict-like presentation of a computed risk score than the equivalent text section
//    would be — removed from clinicianReport.ts for the same reason (see that file's history:
//    automation bias, FDA's Non-Device CDS exemption test). A chart doesn't make an unvalidated
//    score safer to show a clinician, it makes it more persuasive.

import { jsPDF } from "jspdf";
import { PdfCanvas, BRAND, INK, MUTE, renderTitle, renderMetaLine, renderBody, splitReportText } from "./exportReport";
import { buildClinicianReport, type ClinicianReportInput } from "./clinicianReport";
import type { CheckInEntry } from "../types";
import {
  buildIntensitySeries,
  buildSleepSeries,
  buildAdherenceBars,
  buildEngagementStrip,
  type IntensitySeries,
  type SleepSeries,
  type FactorBar,
  type EngagementDay,
} from "./clinicianCharts";

export interface ClinicianChartInputs {
  /** Check-ins for the whole app history — the chart builders filter to the report window. */
  checkins: CheckInEntry[];
  /** Distinct app-open day keys ("YYYY-MM-DD"), for the engagement strip. */
  activeDayKeys: string[];
  /** Inclusive window start ("YYYY-MM-DD"), matching the rest of the report. */
  cutoff: string;
  now?: Date;
}

const LIGHT: [number, number, number] = [225, 225, 230];
const MID: [number, number, number] = [190, 190, 198];

function drawSectionHeading(canvas: PdfCanvas, label: string): void {
  const { doc, M } = canvas;
  canvas.ensure(12);
  canvas.y += 3;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text(label, M, canvas.y);
  canvas.y += 1.6;
  doc.setDrawColor(...BRAND); doc.setLineWidth(0.5); doc.line(M, canvas.y, M + 18, canvas.y);
  canvas.y += 4.5;
}

function drawMutedNote(canvas: PdfCanvas, note: string, height = 12): void {
  const { doc, M, maxW } = canvas;
  canvas.ensure(height);
  const boxTop = canvas.y;
  doc.setDrawColor(...MID);
  doc.setLineDashPattern([1.2, 1], 0);
  doc.roundedRect(M, boxTop, maxW, height, 1.5, 1.5, "S");
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTE);
  const lines = doc.splitTextToSize(note, maxW - 6);
  let ty = boxTop + height / 2 - ((lines.length - 1) * 4) / 2 + 1.5;
  for (const l of lines) { doc.text(l, M + 3, ty); ty += 4; }
  canvas.y = boxTop + height + 4;
}

/** Distress-intensity hero chart: a line through daily check-in intensities (1-10), with the most
 *  recent value called out as an explicit number next to the line's end. */
function drawIntensityChart(canvas: PdfCanvas, series: IntensitySeries): void {
  const { doc, M, maxW } = canvas;
  const H = 34;

  if (!series.sufficient) {
    const n = series.points.length;
    const detail = n === 0
      ? "No check-ins logged in this period."
      : `Only ${n} day${n === 1 ? "" : "s"} logged this period — not enough to chart a trend yet.`;
    drawMutedNote(canvas, detail, 12);
    if (n === 1) {
      canvas.ensure(6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text(`Latest: ${series.points[0].intensity}/10 (${series.points[0].date})`, M, canvas.y + 3);
      canvas.y += 7;
    }
    return;
  }

  canvas.ensure(H + 8);
  const top = canvas.y;
  const chartX = M + 6;
  const chartW = maxW - 6 - 22; // leave room on the right for the callout number
  const chartH = H - 8;
  const chartY = top + 2;

  // Gridlines at 1 / 5 / 10 with axis labels.
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...MUTE);
  for (const v of [1, 5, 10]) {
    const gy = chartY + chartH - ((v - 1) / 9) * chartH;
    doc.line(chartX, gy, chartX + chartW, gy);
    doc.text(String(v), M, gy + 1.2);
  }

  const pts = series.points;
  const stepX = pts.length > 1 ? chartW / (pts.length - 1) : 0;
  const xy = pts.map((p, i) => ({
    x: chartX + stepX * i,
    y: chartY + chartH - ((p.intensity - 1) / 9) * chartH,
  }));

  doc.setDrawColor(...BRAND); doc.setLineWidth(0.8);
  for (let i = 1; i < xy.length; i++) doc.line(xy[i - 1].x, xy[i - 1].y, xy[i].x, xy[i].y);
  doc.setFillColor(...BRAND);
  for (const p of xy) doc.circle(p.x, p.y, 0.9, "F");

  // Date range under the axis.
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTE);
  doc.text(pts[0].date, chartX, chartY + chartH + 5);
  doc.text(pts[pts.length - 1].date, chartX + chartW - 18, chartY + chartH + 5, { align: "left" });

  // Explicit current-value callout — a chart is faster for the trend, but a number is what
  // pins down the latest reading without inference (Bauer/Guerlain/Brown JAMIA 2010).
  const last = pts[pts.length - 1];
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text(`${last.intensity}`, chartX + chartW + 4, chartY + chartH / 2 - 1);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTE);
  doc.text("/10 latest", chartX + chartW + 4, chartY + chartH / 2 + 4);

  canvas.y = top + H + 6;
}

/** Sleep-hours mini chart: bars per logged night with a dashed average-hours reference line. */
function drawSleepChart(canvas: PdfCanvas, series: SleepSeries): void {
  const { doc, M, maxW } = canvas;
  const H = 26;

  if (!series.sufficient) {
    const n = series.points.length;
    drawMutedNote(
      canvas,
      n === 0 ? "No sleep hours logged in this period." : `Only ${n} night${n === 1 ? "" : "s"} logged — not enough for a pattern yet.`,
      12,
    );
    return;
  }

  canvas.ensure(H + 6);
  const top = canvas.y;
  const chartX = M + 6;
  const chartW = maxW - 6;
  const chartH = H - 6;
  const chartY = top + 2;
  const maxHours = Math.max(10, ...series.points.map((p) => p.hours));

  const avg = series.points.reduce((s, p) => s + p.hours, 0) / series.points.length;
  const avgY = chartY + chartH - (avg / maxHours) * chartH;
  doc.setDrawColor(...MID); doc.setLineWidth(0.3); doc.setLineDashPattern([1, 1], 0);
  doc.line(chartX, avgY, chartX + chartW, avgY);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...MUTE);
  doc.text(`avg ${avg.toFixed(1)}h`, chartX + chartW - 16, avgY - 1);

  const n = series.points.length;
  const barW = Math.min(6, (chartW / n) * 0.6);
  const gap = chartW / n;
  doc.setFillColor(...BRAND);
  series.points.forEach((p, i) => {
    const bh = (p.hours / maxHours) * chartH;
    const x = chartX + gap * i + (gap - barW) / 2;
    doc.rect(x, chartY + chartH - bh, barW, bh, "F");
  });

  canvas.y = top + H + 4;
}

/** Reusable labeled horizontal-bar list — used for medication adherence. */
function drawBarList(canvas: PdfCanvas, bars: FactorBar[], emptyNote: string): void {
  const { doc, M, maxW } = canvas;
  if (bars.length === 0) {
    drawMutedNote(canvas, emptyNote, 10);
    return;
  }
  const labelW = 42;
  const pctW = 12;
  const barAreaW = maxW - labelW - pctW - 4;
  const rowH = 6.5;

  canvas.ensure(bars.length * rowH + 2);
  for (const b of bars) {
    const rowY = canvas.y;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
    const labelLines = doc.splitTextToSize(b.label, labelW - 2);
    doc.text(labelLines[0], M, rowY + 3.2);

    const barX = M + labelW;
    doc.setFillColor(...LIGHT);
    doc.rect(barX, rowY, barAreaW, 4, "F");
    doc.setFillColor(...BRAND);
    doc.rect(barX, rowY, (Math.min(100, Math.max(0, b.pct)) / 100) * barAreaW, 4, "F");

    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...INK);
    doc.text(`${b.pct}%`, barX + barAreaW + 3, rowY + 3.2);

    canvas.y += rowH;
  }
  canvas.y += 2;
}

/** Engagement dot-strip: one small square per day in the window, filled if active. */
function drawEngagementStrip(canvas: PdfCanvas, days: EngagementDay[], periodDays: number): void {
  const { doc, M, maxW } = canvas;
  if (days.length === 0) { drawMutedNote(canvas, "No usage data for this period.", 10); return; }

  const dot = 2.6;
  const gap = 0.9;
  const perRow = Math.max(1, Math.floor((maxW + gap) / (dot + gap)));
  const rows = Math.ceil(days.length / perRow);
  const stripH = rows * (dot + gap);

  canvas.ensure(stripH + 8);
  const top = canvas.y;
  doc.setDrawColor(...MID); doc.setLineWidth(0.25);
  days.forEach((d, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = M + col * (dot + gap);
    const y = top + row * (dot + gap);
    if (d.active) { doc.setFillColor(...BRAND); doc.roundedRect(x, y, dot, dot, 0.5, 0.5, "F"); }
    else { doc.roundedRect(x, y, dot, dot, 0.5, 0.5, "S"); }
  });

  const activeCount = days.filter((d) => d.active).length;
  const capY = top + stripH + 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTE);
  doc.text(`${activeCount}/${periodDays} active day(s) this period`, M, capY);
  canvas.y = capY + 4;
}

/**
 * Builds the full clinician PDF: a one-glance chart dashboard (hero intensity trend, sleep,
 * medication adherence, engagement), followed by the existing full-detail
 * text report (screening trajectories, episode log, phenomenological notes, disclaimer) on the
 * pages after — see the file header for why this shape, not a chart-only replacement.
 */
export function generateClinicianPdfBlob(input: ClinicianReportInput, chartInputs: ClinicianChartInputs): Blob | null {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const canvas = new PdfCanvas(doc);
    canvas.beginPage();

    renderTitle(canvas, "NilaMind Clinician Summary");
    renderMetaLine(canvas, input.periodLabel);
    if (input.coverId) renderMetaLine(canvas, `Cover ID: ${input.coverId}`);
    renderMetaLine(canvas, `${input.periodDays}-day report · Clinical Snapshot · generated from on-device data`);
    canvas.y += 2;

    drawSectionHeading(canvas, "Distress Intensity Trend");
    drawIntensityChart(canvas, buildIntensitySeries(chartInputs.checkins, chartInputs.cutoff));

    drawSectionHeading(canvas, "Sleep");
    drawSleepChart(canvas, buildSleepSeries(chartInputs.checkins, chartInputs.cutoff));

    drawSectionHeading(canvas, "Medication Adherence");
    drawBarList(canvas, buildAdherenceBars(input.medications), "No medications tracked in this period.");

    drawSectionHeading(canvas, "Engagement");
    drawEngagementStrip(
      canvas,
      buildEngagementStrip(chartInputs.activeDayKeys, chartInputs.cutoff, chartInputs.now),
      input.periodDays,
    );

    // Full detail — the existing prose report, reusing the shared body renderer.
    canvas.newPage();
    renderTitle(canvas, "Full Detail");
    renderMetaLine(canvas, input.periodLabel);
    canvas.y += 2.5;
    const { rawLines, bodyIndex } = splitReportText(buildClinicianReport(input));
    renderBody(canvas, rawLines, bodyIndex);

    canvas.footer();
    return doc.output("blob");
  } catch {
    return null;
  }
}
