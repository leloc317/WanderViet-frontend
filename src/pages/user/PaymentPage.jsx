import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/axios";

const fmtVND = (n) => `₫${Number(n || 0).toLocaleString("vi-VN")}`;

function CountdownTimer({ expiredAt, onExpired }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => {
      const r = Math.max(0, Math.floor((new Date(expiredAt) - Date.now()) / 1000));
      setSecs(r);
      if (r === 0) onExpired?.();
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiredAt, onExpired]);
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
      ${secs < 120
        ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"
        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"}`}>
      <span>⏱</span>
      <span>Hoàn tất trong <strong>{m}:{String(s).padStart(2,"0")}</strong></span>
    </div>
  );
}

function SuccessModal({ order }) {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/profile/bookings"), 3000);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border dark:border-slate-700 shadow-2xl text-center px-6 py-8">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl animate-bounce">✅</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đặt chỗ thành công!</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
          Booking <span className="font-mono font-semibold">#{order?._id?.slice(-8).toUpperCase()}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Đang chuyển về trang bookings...</p>
        <button onClick={() => navigate("/profile/bookings")}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
          Đi đến Bookings ngay →
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { orderId }      = useParams();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const isCheckout       = searchParams.get("type") === "checkout";

  const [order,          setOrder]         = useState(null);
  const [priceInfo,      setPriceInfo]     = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [paying,         setPaying]        = useState(false);
  const [error,          setError]         = useState("");
  const [expired,        setExpired]       = useState(false);
  const [showSuccess,    setShowSuccess]   = useState(false);
  const [couponCode,     setCouponCode]    = useState("");
  const [couponResult,   setCouponResult]  = useState(null);
  const [couponLoading,  setCouponLoading] = useState(false);
  const [couponError,    setCouponError]   = useState("");
  const [payFull,        setPayFull]       = useState(false);

  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const orderRes = await api.get(`/bookings/${orderId}/detail`);
      const ord = orderRes.data.data;
      setOrder(ord);
      if (ord.status !== "holding") {
        if (["confirmed","checked_in","completed"].includes(ord.status)) {
          navigate("/profile/bookings");
        }
        return;
      }
      const priceRes = await api.get(`/bookings/${orderId}/price-info`);
      setPriceInfo(priceRes.data.data);
    } catch (e) {
      setError(e.response?.data?.message ?? "Không thể tải thông tin thanh toán");
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived price values — declared AFTER state, BEFORE any use
  const PAY_FULL_RATE    = 0.05;
  const rawBase          = priceInfo?.rawBaseAmount ?? priceInfo?.baseAmount ?? 0;
  const depositRate      = priceInfo?.depositRate ?? 0.3;
  const couponSaving     = couponResult?.discountAmount ?? 0;
  const priceAfterCoupon = rawBase - couponSaving;
  const payFullSaving    = payFull ? Math.round(priceAfterCoupon * PAY_FULL_RATE) : 0;
  const effectiveFinal   = priceAfterCoupon - payFullSaving;
  const effectiveDeposit = payFull ? effectiveFinal : Math.round(effectiveFinal * depositRate);
  const effectiveRemain  = payFull ? 0 : effectiveFinal - effectiveDeposit;
  const noPricing        = rawBase === 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError(""); setCouponResult(null);
    try {
      const res = await api.post("/discounts/validate", {
        code:        couponCode.trim(),
        locationId:  order?.location?._id,
        bookingType: order?.bookingType,
        basePrice:   rawBase,
      });
      setCouponResult(res.data.data);
    } catch (e) {
      setCouponError(e.response?.data?.message ?? "Mã không hợp lệ");
    } finally { setCouponLoading(false); }
  };

  const handlePay = async () => {
    if (!order) return;
    setPaying(true); setError("");
    try {
      const payRes = await api.post("/payments/create-deposit", {
        bookingOrderId: orderId,
        couponCode:     couponResult?.discount?.code || null,
        payFull,
      });
      const pdata = payRes.data.data;
      if (pdata?.vnpayUrl) {
        window.location.href = pdata.vnpayUrl;
        return;
      }
      if (pdata?.payment?.vnpayTxnRef) {
        await api.post("/payments/vnpay-mock", { txnRef: pdata.payment.vnpayTxnRef });
        setShowSuccess(true);
      }
    } catch (e) {
      setError(e.response?.data?.message ?? "Thanh toán thất bại");
    } finally { setPaying(false); }
  };

  const handleExpired = () => {
    setExpired(true);
    setTimeout(() => navigate("/profile/bookings"), 3000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"/>
    </div>
  );
  if (error && !priceInfo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 text-center">
      <div>
        <p className="text-4xl mb-3">❌</p>
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← Quay lại</button>
      </div>
    </div>
  );
  if (expired) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 text-center">
      <div>
        <p className="text-4xl mb-3">⏰</p>
        <p className="font-semibold text-gray-900 dark:text-white mb-2">Hết thời gian thanh toán</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">Đang chuyển về...</p>
      </div>
    </div>
  );

  const TYPE_ICON = { hotel:"🏨", restaurant:"🍽️", entertainment:"🎡", tour:"🗺️", tour_product:"🗺️" };
  const inp = "w-full text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-4">

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl transition-colors">←</button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Thanh toán</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">

          <div className="flex items-center gap-3">
            <span className="text-2xl">{TYPE_ICON[order?.bookingType] ?? "📋"}</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {priceInfo?.locationName ?? order?.location?.name ?? "Booking"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                #{orderId?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(""); }}
                onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                placeholder="Mã giảm giá..."
                className={inp + " uppercase placeholder:normal-case flex-1"}
              />
              <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0">
                {couponLoading ? "..." : "Áp dụng"}
              </button>
            </div>
            {couponResult && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Giảm {fmtVND(couponResult.discountAmount)} — {couponResult.discount?.code}</p>}
            {couponError  && <p className="text-xs text-red-500">{couponError}</p>}
          </div>

          {!noPricing && (
            <div onClick={() => setPayFull(p => !p)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all
                ${payFull ? "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10" : "border-gray-200 dark:border-slate-700 hover:border-gray-300"}`}>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">💳 Pay in full — save 5%</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Save {fmtVND(Math.round(priceAfterCoupon * PAY_FULL_RATE))} on this booking</p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${payFull ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-slate-600"}`}>
                {payFull && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-2">
            {noPricing ? (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Pricing not yet configured</p>
                <p className="text-xs text-amber-600 dark:text-amber-300">Confirm your booking slot now — the company will contact you with the final price.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Tổng giá trị</span>
                  <span className="text-gray-900 dark:text-white font-medium">{fmtVND(rawBase)}</span>
                </div>
                {couponSaving > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">Giảm giá ({couponResult?.discount?.code})</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{fmtVND(couponSaving)}</span>
                  </div>
                )}
                {payFullSaving > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">Pay full (5%)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{fmtVND(payFullSaving)}</span>
                  </div>
                )}
                {!payFull && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Đặt cọc ({Math.round(depositRate * 100)}%)</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{fmtVND(effectiveDeposit)}</span>
                  </div>
                )}
                {!payFull && effectiveRemain > 0 && (
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                    <span>Còn lại khi check-out</span>
                    <span>{fmtVND(effectiveRemain)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1.5 border-t border-gray-100 dark:border-slate-800">
                  <span>Cần thanh toán ngay</span>
                  <span className="text-xl">{fmtVND(effectiveDeposit)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {!noPricing && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-[#E2001A] px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#E2001A] font-black text-xs">VN</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">VNPay</p>
                <p className="text-red-200 text-xs">Cổng thanh toán điện tử</p>
              </div>
            </div>
            <div className="p-5">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-4 text-center mb-5">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">🔒 Secure Payment Redirect</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">You will be redirected to VNPay's secure gateway.</p>
                <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 inline-block text-left">
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">Sandbox test card:</p>
                  <p className="text-xs font-mono font-bold text-gray-700 dark:text-slate-300">9704198526191432198</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">Name: NGUYEN VAN A — OTP: 123456</p>
                </div>
              </div>
              {error && <p className="mb-3 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
              <button onClick={handlePay} disabled={paying}
                className="w-full py-4 bg-[#E2001A] hover:bg-[#c00015] text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {paying
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Đang xử lý...</>
                  : <>🔒 Thanh toán {fmtVND(effectiveDeposit)}</>}
              </button>
              <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-3">Được bảo mật bởi VNPay · SSL 256-bit</p>
            </div>
          </div>
        )}

        {noPricing && (
          <button onClick={handlePay} disabled={paying}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {paying
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Đang xử lý...</>
              : <>✅ Confirm Booking — Hold My Slot</>}
          </button>
        )}

        <button onClick={() => navigate(-1)}
          className="w-full py-3 text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          Huỷ và quay lại
        </button>
      </div>
      {showSuccess && <SuccessModal order={order}/>}
    </div>
  );
}