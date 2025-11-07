import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { FiCalendar, FiTrendingUp } from "react-icons/fi";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTableImport from "jspdf-autotable";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/*UI helpers*/
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);
const Section = ({ title, icon, children, id }) => (
  <Card id={id} className="p-4 md:p-5">
    <div className="flex items-center gap-2 text-slate-800 mb-3">
      {icon && <span className="text-xl">{icon}</span>}
      <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
    </div>
    {children}
  </Card>
);

const fmtCurrency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

const toDayKey = (dLike) => {
  const d = new Date(dLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ProductAnalysis() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date range 
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d;
  });
  const [toDate, setToDate] = useState(() => new Date());

  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, [fromDate, toDate, loading]);

  // Fetch
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      setLoading(false);
      return;
    }
    Promise.all([
      axios.get(import.meta.env.VITE_BACKEND_URL+"/api/orders", { headers: { Authorization: "Bearer " + token } }),
      axios.get(import.meta.env.VITE_BACKEND_URL+"/api/suppliers", { headers: { Authorization: "Bearer " + token } }),
    ])
      .then(([oRes, sRes]) => {
        setOrders(Array.isArray(oRes.data) ? oRes.data : []);
        setSuppliers(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch((e) => toast.error(e.response?.data?.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  /*latest per-unit cost per product from suppliers*/
  const unitCostMap = useMemo(() => {
    const latestByPid = new Map();

    const getPid = (s) => s.productId || s.productID || s.product_id || s.product?.id || s.product?.productId;
    const getTime = (s) =>
      new Date(s.updatedAt || s.createdAt || s.date || s.time || Date.now()).getTime();

    for (const s of suppliers) {
      const pid = getPid(s);
      if (!pid) continue;

      const t = getTime(s);

      //per-unit(cost/stock)
      const stock = Number(s.stock ?? s.quantity ?? 0);
      const batchCost = Number(s.cost ?? s.totalCost ?? 0);
      const derivedUnit = stock > 0 ? batchCost / stock : 0;
      const unit = Number(s.unitCost ?? derivedUnit) || 0;

      const cur = latestByPid.get(pid);
      if (!cur || t > cur.time) latestByPid.set(pid, { time: t, unitCost: unit });
    }

    // Map(pid -> unitCost)
    const map = new Map();
    latestByPid.forEach((v, pid) => map.set(pid, v.unitCost));
    return map;
  }, [suppliers]);

  /*(Revenue/Profit)*/
  const {
    dailyRows,
    totals,
    ordersCount,
    revenueChartData,
    profitChartData,
    topProductsByQuantity,
    fromStr,
    toStr,
  } = useMemo(() => {
    const startMs = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)).getTime() : null;
    const endMs = toDate ? new Date(toDate.setHours(23, 59, 59, 999)).getTime() : null;

    const inRange = (d) => {
      const t = new Date(d).getTime();
      if (startMs && t < startMs) return false;
      if (endMs && t > endMs) return false;
      return true;
    };

    const dayAgg = new Map(); // dayKey -> { revenue, profit }
    const productAgg = new Map(); // pid/name -> { name, qty }

    let totalRevenue = 0;
    let totalProfit = 0;

    const inRangeOrders = orders.filter((o) => o?.date && inRange(o.date));
    const ordersCountLocal = inRangeOrders.length;

    for (const order of inRangeOrders) {
      const dayKey = toDayKey(order.date);
      if (!dayAgg.has(dayKey)) dayAgg.set(dayKey, { revenue: 0, profit: 0 });

      const items = Array.isArray(order.products) ? order.products : [];
      for (const line of items) {
        const pInfo = line.productInfo || {};
        const pid =
          pInfo.productId ||
          pInfo._id ||
          pInfo.id ||
          line.productId ||
          pInfo.sku ||
          pInfo.name ||
          "unknown";
        const name = pInfo.name || String(pid);
        const qty = Number(line.quantity ?? line.qty ?? 0);
        if (qty <= 0) continue;

        // selling price
        const price = Number(pInfo.price ?? line.price ?? 0);

        // supplier unit cost
        const unitCost = unitCostMap.get(pid) ?? 0;

        const lineRevenue = price * qty;
        const lineCost = unitCost * qty;
        const lineProfit = lineRevenue - lineCost;

        const d = dayAgg.get(dayKey);
        d.revenue += lineRevenue;
        d.profit += lineProfit;

        totalRevenue += lineRevenue;
        totalProfit += lineProfit;

        const cur = productAgg.get(pid) || { name, qty: 0 };
        cur.qty += qty;
        productAgg.set(pid, cur);
      }
    }

    const rows = Array.from(dayAgg.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, v]) => ({
        day,
        revenue: +v.revenue.toFixed(2),
        profit: +v.profit.toFixed(2),
      }));

    const topQty = Array.from(productAgg.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map((p) => ({ name: p.name, quantity: p.qty }));

    return {
      dailyRows: rows,
      totals: { revenue: +totalRevenue.toFixed(2), profit: +totalProfit.toFixed(2) },
      ordersCount: ordersCountLocal,
      revenueChartData: rows,
      profitChartData: rows,
      topProductsByQuantity: topQty,
      fromStr: fromDate ? toDayKey(fromDate) : "",
      toStr: toDate ? toDayKey(toDate) : "",
    };
  }, [orders, unitCostMap, fromDate, toDate]);

  /* PDF Export*/
  const kpiRef = useRef(null);
  const revRef = useRef(null);
  const profitRef = useRef(null);
  const topRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const captureElem = async (elem) => {
    try {
      if (!elem) return null;
      const rect = elem.getBoundingClientRect?.();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      await wait(250);
      const canvas = await html2canvas(elem, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });
      return canvas.toDataURL("image/png", 1.0);
    } catch (e) {
      console.error("captureElem error:", e);
      return null;
    }
  };

  const safeAutoTable = (pdf, options) => {
    try {
      if (typeof autoTableImport === "function") autoTableImport(pdf, options);
      else if (typeof pdf.autoTable === "function") pdf.autoTable(options);
    } catch (e) {
      console.error("autoTable error:", e);
    }
  };

  const addImgBlock = (pdf, imgData, title, y, margin = 10) => {
    if (!imgData) return y;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const usableW = pageW - margin * 2;
    pdf.setFontSize(12);
    if (y + 8 > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    if (title) {
      pdf.text(title, margin, y);
      y += 4;
    }
    const { width, height } = pdf.getImageProperties(imgData);
    const scaledH = Math.min((height * usableW) / width, pageH - margin - y);
    if (y + scaledH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.addImage(imgData, "PNG", margin, y, usableW, scaledH);
    return y + scaledH + 8;
  };

  const handlePDF = async () => {
    try {
      if (!ready) await wait(450);
      setExporting(true);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(16);
      pdf.text("BuyNest Financial Summary", pageW / 2, 14, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Date range: ${fromStr} - ${toStr}`, pageW / 2, 20, { align: "center" });
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 25, { align: "center" });

      let y = 30;
      y = addImgBlock(pdf, await captureElem(kpiRef.current), "", y);
      y = addImgBlock(pdf, await captureElem(revRef.current), "Revenue by Day", y);
      y = addImgBlock(pdf, await captureElem(profitRef.current), "Profit by Day", y);
      y = addImgBlock(pdf, await captureElem(topRef.current), "Top-Selling Products (Quantity)", y);

      if (y > pageH - 80) {
        pdf.addPage();
        y = 10;
      }

      // KPI table
      safeAutoTable(pdf, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Revenue (range)", fmtCurrency.format(totals.revenue)],
          ["Orders (range)", String(ordersCount)],
          ["Profit (range)", fmtCurrency.format(totals.profit)],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      });

      // Daily table
      safeAutoTable(pdf, {
        margin: { top: 10 },
        head: [["Date", "Revenue", "Profit"]],
        body: dailyRows.map((r) => [
          r.day,
          fmtCurrency.format(r.revenue),
          fmtCurrency.format(r.profit),
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      });

      pdf.save(`product-analysis_${fromStr}_to_${toStr}.pdf`);
    } catch (err) {
      console.error("PDF build error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  /*Render*/
  return (
    <div className="w-full h-full max-h-full overflow-y-auto p-4 md:p-6 font-[var(--font-main)]">
      {/* header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">BuyNest Financial Summary</h1>
          <p className="text-sm text-slate-500">Revenue & Profit and Top Selling Products.</p>
        </div>
        <button
          onClick={handlePDF}
          disabled={!ready || exporting}
          className={`rounded-lg px-3 py-2 text-sm text-white active:scale-[0.98] ${
            !ready || exporting ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {exporting ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      {/* filters */}
      <Card>
        <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <FiCalendar className="text-lg" />
            <span className="text-sm font-medium">Date range</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-500">From</label>
            <DatePicker
              selected={fromDate}
              onChange={(d) => d && setFromDate(d)}
              dateFormat="yyyy-MM-dd"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              maxDate={toDate || undefined}
            />
            <label className="text-xs text-slate-500">To</label>
            <DatePicker
              selected={toDate}
              onChange={(d) => d && setToDate(d)}
              dateFormat="yyyy-MM-dd"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              minDate={fromDate || undefined}
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div ref={kpiRef} className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="px-4 py-3">
          <div className="text-xs text-slate-500">Revenue</div>
          <div className="text-2xl font-bold text-slate-800">{fmtCurrency.format(totals.revenue)}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-slate-500">Orders</div>
          <div className="text-2xl font-bold text-slate-800">{ordersCount}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-slate-500">Profit</div>
          <div className="text-2xl font-bold text-slate-800">{fmtCurrency.format(totals.profit)}</div>
        </Card>
      </div>

      {/* daily table */}
      <Section id="table-block" title="Daily Financial Summary">
        {loading ? (
          <div className="p-6">Loading…</div>
        ) : dailyRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No orders in selected range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-blue-500 text-white">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold uppercase">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase">Revenue</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase">Profit</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((r) => (
                  <tr key={r.day} className="odd:bg-white even:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{r.day}</td>
                    <td className="py-3 px-4">{fmtCurrency.format(r.revenue)}</td>
                    <td className={`py-3 px-4 font-semibold ${r.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {fmtCurrency.format(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* charts */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section id="rev-chart" title="Revenue by Day" icon={<FiTrendingUp />}>
          <div ref={revRef} className="h-72 w-full bg-white">
            <ResponsiveContainer>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => fmtCurrency.format(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue (LKR)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section id="profit-chart" title="Profit by Day" icon={<FiTrendingUp />}>
          <div ref={profitRef} className="h-72 w-full bg-white">
            <ResponsiveContainer>
              <BarChart data={profitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => fmtCurrency.format(v)} />
                <Legend />
                <Bar dataKey="profit" name="Profit (LKR)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Top-Selling Products */}
      <div className="mt-4">
        <Section id="top-chart" title="Top-Selling Products (Quantity)" icon={<FiTrendingUp />}>
          {topProductsByQuantity.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No product sales in this range.</div>
          ) : (
            <div ref={topRef} className="h-96 w-full bg-white">
              <ResponsiveContainer>
                <BarChart data={topProductsByQuantity} margin={{ top: 10, right: 16, left: 8, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    tickFormatter={(l) => (l && l.length > 14 ? l.slice(0, 13) + "…" : l)}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Product: ${label}`} />
                  <Legend />
                  <Bar dataKey="quantity" name="Quantity Sold" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
