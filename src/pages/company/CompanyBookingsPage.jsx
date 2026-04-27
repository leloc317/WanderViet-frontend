import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";
import { PageHeader, Button, Modal, Badge, Tabs, FormField, Textarea, Select } from "../../components/ui";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

const STATUS_COLOR = {
  pending:"yellow", confirmed:"green", completed:"blue",
  cancelled:"gray",  no_show:"red",    rejected:"red",
};

const TABS = [
  { key:"",          label:"All"       },
  { key:"pending",   label:"Pending"   },
  { key:"confirmed", label:"Confirmed" },
  { key:"completed", label:"Completed" },
  { key:"no_show",   label:"No Show"   },
  { key:"cancelled", label:"Cancelled" },
];

const TYPE_ICON = { restaurant:"🍽️", hotel:"🏨", entertainment:"🎡", tour:"🗺️" };

function BookingDetails({ order }) {
  const t = order.bookingType;
  const d = order[`${t}Details`];
  if (!d) return null;

  return (
    <div className="mt-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-xs space-y-1">
      {t === "restaurant" && (
        <>
          <p><span className="text-gray-500 dark:text-slate-400">Date & Time:</span> <strong className="text-gray-900 dark:text-white">{d.date} {d.time}</strong></p>
          <p><span className="text-gray-500 dark:text-slate-400">Party:</span> <strong className="text-gray-900 dark:text-white">{d.partySize} people</strong></p>
          {d.seatingPref && d.seatingPref !== "no_preference" && (
            <p><span className="text-gray-500 dark:text-slate-400">Seating:</span> <strong className="text-gray-900 dark:text-white capitalize">{d.seatingPref}</strong></p>
          )}
        </>
      )}
      {t === "hotel" && (
        <>
          <p><span className="text-gray-500 dark:text-slate-400">Check-in:</span> <strong className="text-gray-900 dark:text-white">{d.checkIn}</strong></p>
          <p><span className="text-gray-500 dark:text-slate-400">Check-out:</span> <strong className="text-gray-900 dark:text-white">{d.checkOut}</strong> ({d.nights} nights)</p>
          <p><span className="text-gray-500 dark:text-slate-400">Guests:</span> <strong className="text-gray-900 dark:text-white">{d.adults} adults, {d.children} children</strong></p>
        </>
      )}
      {t === "entertainment" && (
        <>
          <p><span className="text-gray-500 dark:text-slate-400">Date:</span> <strong className="text-gray-900 dark:text-white">{d.date} {d.time}</strong></p>
          <p><span className="text-gray-500 dark:text-slate-400">Tickets:</span> <strong className="text-gray-900 dark:text-white">{d.quantity}x {d.ticketType||"Standard"}</strong></p>
        </>
      )}
      {t === "tour" && (
        <>
          <p><span className="text-gray-500 dark:text-slate-400">Departure:</span> <strong className="text-gray-900 dark:text-white">{d.date}</strong></p>
          <p><span className="text-gray-500 dark:text-slate-400">Group:</span> <strong className="text-gray-900 dark:text-white">{d.adults} adults, {d.children} children</strong></p>
          {d.groupType && <p><span className="text-gray-500 dark:text-slate-400">Group type:</span> <strong className="text-gray-900 dark:text-white capitalize">{d.groupType.replace(/_/g," ")}</strong></p>}
        </>
      )}
      {d.specialReq && (
        <p><span className="text-gray-500 dark:text-slate-400">Special req:</span> <span className="text-gray-700 dark:text-slate-300 italic">"{d.specialReq}"</span></p>
      )}
    </div>
  );
}

export default function CompanyBookingsPage() {
  const [orders,  setOrders]   = useState([]);
  const [loading, setLoading]  = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [selected,  setSelected]  = useState(null);
  const [actionModal, setActionModal] = useState(null); // "confirm"|"reject"|"complete"|"noshow"
  const [note,    setNote]     = useState("");
  const [saving,  setSaving]   = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings/company", {
        params: { status: activeTab, limit: 50 }
      });
      setOrders(data.data.orders);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchOrders(); }, [activeTab]);

  const openAction = (order, action) => {
    setSelected(order); setActionModal(action); setNote("");
  };

  const handleAction = async () => {
    setSaving(true);
    try {
      const endpointMap = {
        confirm:  `/bookings/${selected._id}/confirm`,
        reject:   `/bookings/${selected._id}/reject`,
        complete: `/bookings/${selected._id}/complete`,
        noshow:   `/bookings/${selected._id}/no-show`,
      };
      await api.patch(endpointMap[actionModal], { note, reason: note });
      setActionModal(null); fetchOrders();
    } catch(e) { alert(e.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  // Timer display
  const getElapsed = (createdAt) => {
    const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ${mins%60}m ago`;
  };

  const getUrgency = (createdAt) => {
    const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
    if (mins >= 40) return "red";
    if (mins >= 25) return "orange";
    if (mins >= 10) return "yellow";
    return "green";
  };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Manage customer booking requests"/>
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab}/>

      {loading ? (
        <div className="space-y-3 mt-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"/>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500 mt-4">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No {activeTab || ""} bookings</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {orders.map(order => (
            <div key={order._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{TYPE_ICON[order.bookingType]}</span>
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-gray-900 dark:text-white">{order.contactName}</p>
                    <Badge label={order.status} color={STATUS_COLOR[order.status]} size="sm"/>
                    {order.status === "pending" && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                        ${getUrgency(order.createdAt) === "red" ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                        : getUrgency(order.createdAt) === "orange" ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"
                                        : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"}`}>
                        ⏱ {getElapsed(order.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Contact */}
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                    📞 {order.contactPhone}
                    {order.contactEmail && ` · ✉️ ${order.contactEmail}`}
                    {order.age && ` · ${order.age}y`}
                    {order.gender && ` · ${order.gender}`}
                  </p>

                  {/* Location */}
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    📍 {order.location?.name}
                  </p>

                  {/* User trust score */}
                  {order.user?.bookingScore !== undefined && (
                    <p className="text-xs mt-1">
                      <span className="text-gray-400 dark:text-slate-500">Reliability score: </span>
                      <span className={`font-semibold
                                        ${order.user.bookingScore >= 80 ? "text-emerald-600 dark:text-emerald-400"
                                        : order.user.bookingScore >= 50 ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-red-500"}`}>
                        {order.user.bookingScore}/100
                      </span>
                    </p>
                  )}

                  <BookingDetails order={order}/>

                  {order.userNote && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 italic">
                      Note: "{order.userNote}"
                    </p>
                  )}

                  {order.companyNote && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Your note: "{order.companyNote}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col gap-2">
                  {order.status === "pending" && (
                    <>
                      <Button size="sm" variant="success" onClick={() => openAction(order,"confirm")}>✓ Confirm</Button>
                      <Button size="sm" variant="danger"  onClick={() => openAction(order,"reject")}>✕ Reject</Button>
                    </>
                  )}
                  {order.status === "confirmed" && (
                    <>
                      <Button size="sm" variant="primary"  onClick={() => openAction(order,"complete")}>✓ Complete</Button>
                      <Button size="sm" variant="danger"   onClick={() => openAction(order,"noshow")}>No Show</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={
          actionModal === "confirm"  ? "Confirm Booking"    :
          actionModal === "reject"   ? "Reject Booking"     :
          actionModal === "complete" ? "Mark as Completed"  :
          actionModal === "noshow"   ? "Mark as No-Show"    : ""
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal === "confirm" || actionModal === "complete" ? "success" : "danger"}
              onClick={handleAction} loading={saving}>
              Confirm
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {selected && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{selected.contactName}</p>
              <p className="text-gray-500 dark:text-slate-400">{selected.contactPhone}</p>
            </div>
          )}
          {actionModal === "noshow" && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30
                            rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
              ⚠️ Marking as no-show will deduct 20 points from the customer's reliability score.
            </div>
          )}
          <FormField label={actionModal === "reject" ? "Rejection Reason *" : "Note (optional)"}>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={actionModal === "reject"
                ? "Why are you rejecting? (e.g. fully booked, closed today)"
                : "Optional note for the customer..."}/>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}