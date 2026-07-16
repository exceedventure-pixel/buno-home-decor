import { OrderCourierTracking } from "@lib/data/orders"

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting pickup",
  in_transit: "In transit",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
}

/**
 * Courier delivery status for the customer, shown on their order pages. Renders nothing when the
 * order has no courier shipment (manual fulfilment or not yet booked).
 */
const CourierTracking = ({ tracking }: { tracking: OrderCourierTracking | null }) => {
  if (!tracking) return null

  const label = STATUS_LABEL[tracking.status] ?? tracking.status
  const cls = STATUS_CLASS[tracking.status] ?? "bg-gray-100 text-gray-700"

  return (
    <div className="flex flex-col gap-y-2 border-b border-gray-200 pb-6">
      <h2 className="text-base-semi">Delivery</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small-regular text-ui-fg-base">
        <span>{tracking.courier_name}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
          {label}
        </span>
      </div>
      {tracking.tracking_id && (
        <div className="text-small-regular text-ui-fg-subtle">
          Tracking #: <span className="font-mono text-ui-fg-base">{tracking.tracking_id}</span>
          {tracking.tracking_url && (
            <>
              {" · "}
              <a
                href={tracking.tracking_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ui-fg-interactive hover:underline"
              >
                Track parcel
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CourierTracking
