import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Container, Text, Badge, Button, Input, Switch, toast } from "@medusajs/ui"
import { adminFetch } from "../../../lib/api"
import { NotConfiguredNotice } from "../../../components/integration-setup-guide"

type TrackingSettings = {
  meta_pixel_id: string | null
  ga4_measurement_id: string | null
  capi_enabled: boolean
  capi_configured: boolean
  capi_test_event_code: string | null
  purchase_event_enabled: boolean
}

/** Which card's save button is currently in flight — only one at a time. */
type Section = "pixel" | "ga4" | "capi"

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return configured
    ? <Badge color="green" size="2xsmall">Configured</Badge>
    : <Badge color="orange" size="2xsmall">Not configured</Badge>
}

/**
 * Catch the most common paste mistake before it reaches the API.
 *
 * The API stores whatever string it's given, and the storefront drops that value straight into
 * `gtag/js?id=...`. Pasting the whole <script> snippet from Google therefore saves "successfully"
 * and silently breaks tracking, with nothing to indicate why. These check the shape instead.
 */
function validateGa4(value: string): string | null {
  if (!value) return null // empty clears the setting — intentional
  if (/<script|googletagmanager|gtag\(/i.test(value)) {
    return "That's the full snippet. Paste only the Measurement ID — the G-XXXXXXXXXX part."
  }
  if (!/^G-[A-Z0-9]{4,}$/i.test(value)) {
    return "Measurement IDs look like G-XXXXXXXXXX."
  }
  return null
}

function validatePixel(value: string): string | null {
  if (!value) return null
  if (/<script|fbq\(/i.test(value)) {
    return "That's the full snippet. Paste only the Pixel ID — the 15-16 digit number."
  }
  if (!/^\d{15,16}$/.test(value)) {
    return "Pixel IDs are a 15-16 digit number."
  }
  return null
}

export function TrackingSection() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<TrackingSettings>({
    queryKey: ["admin-tracking"],
    queryFn: () => adminFetch<TrackingSettings>("/tracking"),
  })

  const [pixelId, setPixelId] = useState("")
  const [ga4Id, setGa4Id] = useState("")
  const [testEventCode, setTestEventCode] = useState("")
  const [capiEnabled, setCapiEnabled] = useState(false)
  const [purchaseEnabled, setPurchaseEnabled] = useState(true)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [savingSection, setSavingSection] = useState<Section | null>(null)
  const [fieldError, setFieldError] = useState<{ pixel?: string; ga4?: string }>({})

  /**
   * Seed the inputs once, on first load only.
   *
   * Deliberately NOT re-run after each save: with per-card saves, re-seeding every field from the
   * server would wipe out whatever the operator had typed into the *other* cards but not saved yet.
   * The badges read from `data`, so they still reflect server truth after a refetch.
   */
  if (data && !initialized) {
    setPixelId(data.meta_pixel_id ?? "")
    setGa4Id(data.ga4_measurement_id ?? "")
    setTestEventCode(data.capi_test_event_code ?? "")
    setCapiEnabled(data.capi_enabled ?? false)
    setPurchaseEnabled(data.purchase_event_enabled ?? true)
    setInitialized(true)
  }

  // The success message rides alongside the payload — not inside it — so each card can report its
  // own outcome without sending a stray field the API would have to ignore.
  const saveMutation = useMutation({
    mutationFn: ({ payload }: { payload: Record<string, unknown>; message: string }) =>
      adminFetch("/tracking", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_res, { message }) => {
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: ["admin-tracking"] })
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
    onSettled: () => setSavingSection(null),
  })

  const save = (section: Section, payload: Record<string, unknown>, message: string) => {
    setSavingSection(section)
    saveMutation.mutate({ payload, message })
  }

  const handleSavePixel = () => {
    const value = pixelId.trim()
    const err = validatePixel(value)
    setFieldError((p) => ({ ...p, pixel: err ?? undefined }))
    if (err) return
    save("pixel", { meta_pixel_id: value || null }, value ? "Meta Pixel configured" : "Meta Pixel cleared")
  }

  const handleSaveGa4 = () => {
    const value = ga4Id.trim()
    const err = validateGa4(value)
    setFieldError((p) => ({ ...p, ga4: err ?? undefined }))
    if (err) return
    save("ga4", { ga4_measurement_id: value || null }, value ? "Google Analytics configured" : "Google Analytics cleared")
  }

  const handleSaveCapi = () =>
    save(
      "capi",
      {
        capi_enabled: capiEnabled,
        purchase_event_enabled: purchaseEnabled,
        capi_test_event_code: testEventCode.trim() || null,
      },
      "Conversions API settings saved"
    )

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await adminFetch<{ success: boolean; message: string }>("/tracking/test-capi", { method: "POST" })
      setTestResult(result)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    } catch (err: any) {
      const msg = err.message || "Test failed"
      setTestResult({ success: false, message: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-md bg-ui-tag-red-bg px-4 py-3">
        <Text size="small" className="text-ui-tag-red-text">{(error as Error).message || "Failed to load tracking settings"}</Text>
      </div>
    )
  }

  if (isLoading) {
    return <Text size="small" className="text-ui-fg-subtle">Loading settings…</Text>
  }

  const pixelDirty = pixelId.trim() !== (data?.meta_pixel_id ?? "")
  const ga4Dirty = ga4Id.trim() !== (data?.ga4_measurement_id ?? "")
  const capiDirty =
    capiEnabled !== (data?.capi_enabled ?? false) ||
    purchaseEnabled !== (data?.purchase_event_enabled ?? true) ||
    testEventCode.trim() !== (data?.capi_test_event_code ?? "")

  return (
    <div className="flex flex-col gap-y-3">
      {/* Meta Pixel */}
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="base" weight="plus">Meta Pixel</Text>
          <ConfiguredBadge configured={Boolean(data?.meta_pixel_id)} />
        </div>
        <div className="px-6 py-4 flex flex-col gap-y-2">
          <Text size="small" weight="plus">Pixel ID</Text>
          <Input
            placeholder="e.g. 1234567890123456"
            value={pixelId}
            onChange={(e) => {
              setPixelId(e.target.value)
              setFieldError((p) => ({ ...p, pixel: undefined }))
            }}
            aria-invalid={Boolean(fieldError.pixel)}
          />
          {fieldError.pixel
            ? <Text size="small" className="text-ui-tag-red-text">{fieldError.pixel}</Text>
            : <Text size="small" className="text-ui-fg-subtle">15-16 digit number from Meta Events Manager. Not a secret — stored plainly.</Text>}
          <div className="flex items-center gap-x-3 pt-1">
            <Button
              size="small"
              variant="secondary"
              isLoading={savingSection === "pixel"}
              disabled={savingSection !== null || !pixelDirty}
              onClick={handleSavePixel}
            >
              Save Pixel ID
            </Button>
            {!pixelDirty && data?.meta_pixel_id && (
              <Text size="small" className="text-ui-fg-subtle">Saved — tracking is live.</Text>
            )}
          </div>
        </div>
      </Container>

      {/* GA4 */}
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="base" weight="plus">Google Analytics 4</Text>
          <ConfiguredBadge configured={Boolean(data?.ga4_measurement_id)} />
        </div>
        <div className="px-6 py-4 flex flex-col gap-y-2">
          <Text size="small" weight="plus">Measurement ID</Text>
          <Input
            placeholder="e.g. G-XXXXXXXXXX"
            value={ga4Id}
            onChange={(e) => {
              setGa4Id(e.target.value)
              setFieldError((p) => ({ ...p, ga4: undefined }))
            }}
            aria-invalid={Boolean(fieldError.ga4)}
          />
          {fieldError.ga4
            ? <Text size="small" className="text-ui-tag-red-text">{fieldError.ga4}</Text>
            : <Text size="small" className="text-ui-fg-subtle">Format: G-XXXXXXXXXX. From Google Analytics → Data Streams → Web.</Text>}
          <div className="flex items-center gap-x-3 pt-1">
            <Button
              size="small"
              variant="secondary"
              isLoading={savingSection === "ga4"}
              disabled={savingSection !== null || !ga4Dirty}
              onClick={handleSaveGa4}
            >
              Save Measurement ID
            </Button>
            {!ga4Dirty && data?.ga4_measurement_id && (
              <Text size="small" className="text-ui-fg-subtle">Saved — tracking is live.</Text>
            )}
          </div>
        </div>
      </Container>

      {/* Meta CAPI */}
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="base" weight="plus">Meta Conversions API</Text>
          <div className="flex items-center gap-x-2">
            <ConfiguredBadge configured={Boolean(data?.capi_configured)} />
            {data?.capi_enabled && <Badge color="blue" size="2xsmall">Enabled</Badge>}
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-subtle">
            The CAPI access token is set via the <code className="bg-ui-bg-subtle px-1 rounded text-xs">META_CAPI_ACCESS_TOKEN</code> environment variable. Generate it in Events Manager → your Pixel → Conversions API.
          </Text>
          {!data?.capi_configured && (
            <NotConfiguredNotice>
              Not configured yet — set <b>META_CAPI_ACCESS_TOKEN</b> on the server (or contact your developer). Until then CAPI stays disabled.
            </NotConfiguredNotice>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <Text size="small" weight="plus">Enable CAPI</Text>
            <Text size="small" className="text-ui-fg-subtle">Send server-side events to Meta's Conversions API</Text>
          </div>
          <Switch checked={capiEnabled} onCheckedChange={setCapiEnabled} disabled={!data?.capi_configured} />
        </div>

        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <Text size="small" weight="plus">Send Purchase events</Text>
            <Text size="small" className="text-ui-fg-subtle">Fire a CAPI Purchase event on order placement (deduplicated with browser Pixel)</Text>
          </div>
          <Switch checked={purchaseEnabled} onCheckedChange={setPurchaseEnabled} disabled={!capiEnabled} />
        </div>

        <div className="px-6 py-4 flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">Test Event Code (optional)</Text>
            <Input placeholder="e.g. TEST12345" value={testEventCode} onChange={(e) => setTestEventCode(e.target.value)} />
            <Text size="small" className="text-ui-fg-subtle">From Meta Events Manager → Test Events. Verifies events without polluting real data.</Text>
          </div>

          <div className="flex items-center gap-x-2">
            <Button
              size="small"
              variant="secondary"
              isLoading={savingSection === "capi"}
              disabled={savingSection !== null || !capiDirty}
              onClick={handleSaveCapi}
            >
              Save CAPI settings
            </Button>
            <Button size="small" variant="secondary" disabled={!data?.capi_configured || testing || capiDirty} isLoading={testing} onClick={handleTest}>
              Send test event
            </Button>
          </div>
          {capiDirty && (
            <Text size="small" className="text-ui-fg-subtle">Save your changes before sending a test event.</Text>
          )}

          {testResult && (
            <div className={`flex items-center gap-x-2 rounded-md px-3 py-2 text-sm ${testResult.success ? "bg-ui-tag-green-bg text-ui-tag-green-text" : "bg-ui-tag-red-bg text-ui-tag-red-text"}`}>
              <span>{testResult.success ? "✓" : "✗"}</span>
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
