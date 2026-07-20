import { Button, Input, Label, Prompt, Select, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { adminFetch } from "../lib/api"

export type Supplier = {
  id: string
  name: string
  phone: string | null
  note: string | null
  is_active: boolean
}

/** Sentinel for the "add a new one" row — no supplier can be named this. */
const ADD_NEW = "__add_new__"

export const useSuppliers = (activeOnly = true) =>
  useQuery<{ suppliers: Supplier[] }>({
    queryKey: ["suppliers", activeOnly ? "active" : "all"],
    queryFn: () => adminFetch(`/suppliers${activeOnly ? "?active=true" : ""}`),
    staleTime: 60000,
  })

/**
 * Pick who the stock was bought from.
 *
 * This replaces a free-text box. The batch still records the supplier NAME, so the value here is
 * the name — but choosing it from a managed list is what stops "Rahim" / "rahim" / "Rahim Traders"
 * becoming three suppliers that can never be totalled.
 *
 * Adding is inline because restocking is when you discover you have a new supplier; forcing a trip
 * to a settings page mid-form is how people end up typing it free-hand again.
 */
export function SupplierSelect({
  value,
  onChange,
  label = "Supplier",
}: {
  /** The supplier NAME, or "" for none. */
  value: string
  onChange: (name: string) => void
  label?: string
}) {
  const qc = useQueryClient()
  const { data, isLoading } = useSuppliers(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const suppliers = data?.suppliers ?? []

  const create = useMutation({
    mutationFn: () =>
      adminFetch<{ supplier: Supplier }>("/suppliers", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim() || null }),
      }),
    onSuccess: (r) => {
      toast.success(`Supplier "${r.supplier.name}" added`)
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      onChange(r.supplier.name)
      setAddOpen(false)
      setNewName("")
      setNewPhone("")
    },
    onError: (e: Error) => toast.error(e.message || "Could not add supplier"),
  })

  return (
    <div className="flex flex-col gap-y-1">
      <Label size="small">{label}</Label>
      <Select
        value={value || ""}
        onValueChange={(v) => {
          if (v === ADD_NEW) {
            setAddOpen(true)
            return
          }
          onChange(v)
        }}
      >
        <Select.Trigger>
          <Select.Value placeholder={isLoading ? "Loading…" : "Select a supplier"} />
        </Select.Trigger>
        <Select.Content>
          {suppliers.map((s) => (
            <Select.Item key={s.id} value={s.name}>
              {s.name}
            </Select.Item>
          ))}
          <Select.Item value={ADD_NEW}>＋ Add a new supplier…</Select.Item>
        </Select.Content>
      </Select>

      {!isLoading && suppliers.length === 0 && (
        <Text size="xsmall" className="text-ui-fg-muted">
          No suppliers yet — add one to record who stock came from.
        </Text>
      )}

      <Prompt open={addOpen} onOpenChange={(v) => !v && setAddOpen(false)}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Add a supplier</Prompt.Title>
            <Prompt.Description>
              They'll be available on every restock from now on.
            </Prompt.Description>
          </Prompt.Header>

          <div className="flex flex-col gap-y-3 px-6 pb-2">
            <div className="flex flex-col gap-y-1">
              <Label size="small">Name</Label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rahim Traders"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim() && !create.isPending) create.mutate()
                }}
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small">Phone (optional)</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
          </div>

          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Button
              size="small"
              disabled={!newName.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Adding…" : "Add supplier"}
            </Button>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}
