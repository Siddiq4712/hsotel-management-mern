import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { wardenAPI } from "../../services/api";

dayjs.extend(relativeTime);

const STATUS_BADGES = {
  pending: "bg-amber-100 text-amber-700 border border-amber-300",
  approved: "bg-green-100 text-green-700 border border-green-300",
  rejected: "bg-red-100 text-red-700 border border-red-300",
  cancelled: "bg-gray-100 text-gray-600 border border-gray-300",
};

const DecisionDialog = ({ request, onClose, onSubmit, busy }) => {
  const [decision, setDecision] = useState("approved");
  const [remarks, setRemarks] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">Process Room Request</h3>
            <p className="text-sm text-gray-500">
              Student: {request.Student?.username} ({request.Student?.roll_number || "No roll"})
            </p>
            <p className="text-sm text-gray-500">
              Room: {request.Room?.room_number} ({request.Room?.RoomType?.name || "Unknown type"})
            </p>
          </div>
          <button
            type="button"
            className="text-gray-400 transition hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Decision</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="approved">Approve & allot room</option>
              <option value="rejected">Reject request</option>
              <option value="cancelled">Cancel request</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Remarks <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add a note for audit trail"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:bg-blue-400"
            onClick={() => onSubmit({ decision, remarks })}
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RoomRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: "pending" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState({ open: false, request: null });
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await wardenAPI.getRoomRequests(filters.status === "all" ? {} : { status: filters.status });
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error("Warden room request fetch error:", err);
      setError(err?.message || "Failed to load room requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters.status]);

  const handleDecision = async ({ decision, remarks }) => {
    if (!dialog.request) return;

    setProcessingId(dialog.request.id);
    try {
      await wardenAPI.updateRoomRequest(dialog.request.id, { decision, remarks });
      await fetchRequests();
      setDialog({ open: false, request: null });
    } catch (err) {
      console.error("Room request decision error:", err);
      alert(err?.message || "Failed to process the request.");
    } finally {
      setProcessingId(null);
    }
  };

  const tableRows = useMemo(
    () =>
      requests.map((req) => {
        const statusClass = STATUS_BADGES[req.status] || STATUS_BADGES.pending;
        const capacity = req.Room?.RoomType?.capacity ?? "-";
        const occupancy = req.Room?.occupancy_count ?? 0;

        return (
          <tr key={req.id} className="border-b last:border-none">
            <td className="px-3 py-3 text-sm">
              <div className="font-semibold text-gray-800">{req.Student?.username}</div>
              <div className="text-xs text-gray-500">
                {req.Student?.roll_number ? `Roll: ${req.Student.roll_number}` : "Roll number not set"}
              </div>
              <div className="text-xs text-gray-400">{req.Student?.email}</div>
            </td>

            <td className="px-3 py-3 text-sm">
              <div className="font-medium text-gray-800">{req.Room?.room_number}</div>
              <div className="text-xs text-gray-500">{req.Room?.RoomType?.name || "Room type N/A"}</div>
              <div className="text-xs text-gray-400">
                {occupancy}/{capacity} occupants
              </div>
            </td>

            <td className="px-3 py-3 text-sm">
              <div>{dayjs(req.requested_at).format("DD MMM YYYY, hh:mm A")}</div>
              <div className="text-xs text-gray-500">{dayjs(req.requested_at).fromNow()}</div>
            </td>

            <td className="px-3 py-3 text-sm">
              <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${statusClass}`}>
                {req.status}
              </span>
              {req.ProcessedBy && (
                <div className="mt-1 text-xs text-gray-500">
                  By {req.ProcessedBy.username} on {req.processed_at ? dayjs(req.processed_at).format("DD MMM YYYY") : "-"}
                </div>
              )}
            </td>

            <td className="px-3 py-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {req.status === "pending" && (
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    onClick={() => setDialog({ open: true, request: req })}
                  >
                    Review
                  </button>
                )}
                {req.status !== "pending" && req.remarks && (
                  <button
                    type="button"
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    onClick={() =>
                      alert(
                        `Processed by: ${req.ProcessedBy?.username || "N/A"}\nStatus: ${req.status}\nRemarks: ${req.remarks}`,
                      )
                    }
                  >
                    View remarks
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      }),
    [requests],
  );

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Room Booking Requests</h1>
        <p className="text-sm text-gray-500">
          Review student booking requests and approve or reject them. Approving will immediately allot the room.
        </p>
      </header>

      <section className="rounded border bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-600">
            Status
            <select
              className="ml-2 rounded border px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
            >
              <option value="all">All</option>
              <option value="pending">Pending only</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            onClick={fetchRequests}
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded border bg-white shadow">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading requests…</div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No room requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Room</th>
                  <th className="px-3 py-3">Requested at</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">{tableRows}</tbody>
            </table>
          </div>
        )}
      </section>

      {dialog.open && dialog.request && (
        <DecisionDialog
          request={dialog.request}
          onClose={() => setDialog({ open: false, request: null })}
          onSubmit={handleDecision}
          busy={processingId === dialog.request.id}
        />
      )}
    </div>
  );
};

export default RoomRequests;
