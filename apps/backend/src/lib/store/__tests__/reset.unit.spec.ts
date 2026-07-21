import { purgeAccounting } from "../reset"

/**
 * CLEARING THE BOOKS MEANS ALL FOUR TABLES.
 *
 * Fixed assets, marketing spends and partners are separate tables that merely REFERENCE ledger
 * rows. An earlier version of the system-mode roll deleted only the ledger, which left partners
 * showing ৳0 invested and assets with no cash trail — a state that reads as corruption rather
 * than a clean slate. Both callers (Danger Zone reset and the roll) now share this function; this
 * test is what stops them drifting apart again.
 */
describe("purgeAccounting", () => {
  const svc = () => {
    const rows = {
      ledger: [{ id: "l1" }, { id: "l2" }],
      assets: [{ id: "a1" }],
      marketing: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
      partners: [{ id: "p1" }],
    }
    return {
      deleted: { ledger: [] as string[], assets: [] as string[], marketing: [] as string[], partners: [] as string[] },
      rows,
      listLedgerEntries: async () => rows.ledger,
      deleteLedgerEntries: async function (ids: string[]) { this.deleted.ledger = ids },
      listFixedAssets: async () => rows.assets,
      deleteFixedAssets: async function (ids: string[]) { this.deleted.assets = ids },
      listMarketingSpends: async () => rows.marketing,
      deleteMarketingSpends: async function (ids: string[]) { this.deleted.marketing = ids },
      listPartners: async () => rows.partners,
      deletePartners: async function (ids: string[]) { this.deleted.partners = ids },
    }
  }

  it("deletes ledger, fixed assets, marketing spends AND partners", async () => {
    const s = svc()
    const scope: any = { resolve: () => s }

    const result = await purgeAccounting(scope)

    expect(s.deleted.ledger).toEqual(["l1", "l2"])
    expect(s.deleted.assets).toEqual(["a1"])
    expect(s.deleted.marketing).toEqual(["m1", "m2", "m3"])
    expect(s.deleted.partners).toEqual(["p1"])

    expect(result).toEqual({
      ledger_entries: 2,
      fixed_assets: 1,
      marketing_spends: 3,
      partners: 1,
    })
  })

  it("is a no-op on an already-empty set of books", async () => {
    const s = svc()
    s.rows.ledger = []
    s.rows.assets = []
    s.rows.marketing = []
    s.rows.partners = []
    const scope: any = { resolve: () => s }

    await expect(purgeAccounting(scope)).resolves.toEqual({
      ledger_entries: 0,
      fixed_assets: 0,
      marketing_spends: 0,
      partners: 0,
    })
    // Nothing to delete means no delete call at all.
    expect(s.deleted.ledger).toEqual([])
    expect(s.deleted.partners).toEqual([])
  })
})
