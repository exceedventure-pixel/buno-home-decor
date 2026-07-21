import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Container, Heading, Tabs, Text } from "@medusajs/ui"
import { useState } from "react"

import { usePermissions } from "../../lib/permissions"
import { useSystemMode } from "../../lib/system-mode"
import { CashBookSection } from "./sections/cash-book-section"
import { DashboardSection } from "./sections/dashboard-section"
import { FixedAssetsSection } from "./sections/fixed-assets-section"
import { MarketingSection } from "./sections/marketing-section"
import { OrphanWarning } from "../../components/orphan-warning"
import { OperationalSection } from "./sections/operational-section"
import { PackagingSection } from "./sections/packaging-section"
import { PartnersSection } from "./sections/partners-section"
import { RestockSection } from "./sections/restock-section"

const AccountingPage = () => {
  const { can, isLoading } = usePermissions()
  const { isBasic, isLoading: modeLoading } = useSystemMode()
  const [tab, setTab] = useState("dashboard")

  // The API is the real boundary (it 403s), but net worth has no business appearing in the
  // sidebar for someone who can't open it. A marketer with only marketing_spend still gets
  // in — the Marketing tab is theirs.
  const canAccounting = can("accounting", "read")
  const canMarketing = can("marketing_spend", "read")

  if (isLoading || modeLoading) return null

  /**
   * Basic mode has no books to show. The sidebar entry stays (Medusa registers nav statically at
   * build time, so it can't be removed at runtime) — so the page says why it's empty and where to
   * turn it on, rather than rendering a dashboard of zeros.
   */
  if (isBasic) {
    return (
      <Container className="flex flex-col gap-y-2 p-8">
        <Heading level="h1">Accounting is off</Heading>
        <Text className="text-ui-fg-subtle">
          This store runs the <b>Basic</b> system: stock is managed the standard Medusa way and
          there's no Cash Book, FIFO costing or restocking. Sales Insights still reports revenue,
          cost of goods, delivery margin and profit.
        </Text>
        <Text size="small" className="text-ui-fg-muted">
          To switch on the full accounting system, go to <b>Store Settings → System Mode</b> and
          roll to Advanced. Rolling resets the store, so it's a deliberate step.
        </Text>
      </Container>
    )
  }

  if (!canAccounting && !canMarketing) {
    return (
      <Container className="p-8">
        <Text className="text-ui-fg-subtle">
          You don't have access to the Accounting section.
        </Text>
      </Container>
    )
  }

  // Marketing-only users see just their tab.
  if (!canAccounting && canMarketing) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Marketing</Heading>
        </div>
        <div className="px-6 py-6">
          <MarketingSection />
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Accounting</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            What we've put in, what it's worth now, and where it's sitting.
          </Text>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-6">
        {/* Books carrying a deleted order — visible on every tab, because it skews all of them. */}
        <OrphanWarning />

        <Tabs value={tab} onValueChange={setTab}>
          {/* Too many tabs to fit a phone — let the strip scroll sideways instead of the page. */}
          <div className="overflow-x-auto">
            <Tabs.List className="w-max">
              <Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
              <Tabs.Trigger value="partners">Investment Pool</Tabs.Trigger>
              <Tabs.Trigger value="fixed-assets">Fixed Assets</Tabs.Trigger>
              <Tabs.Trigger value="restock">Restock</Tabs.Trigger>
              <Tabs.Trigger value="packaging">Packaging</Tabs.Trigger>
              <Tabs.Trigger value="marketing">Marketing</Tabs.Trigger>
              <Tabs.Trigger value="operational">Operational Expenses</Tabs.Trigger>
              <Tabs.Trigger value="cash-book">Cash Book</Tabs.Trigger>
            </Tabs.List>
          </div>

          <div className="mt-6">
            <Tabs.Content value="dashboard">
              <DashboardSection />
            </Tabs.Content>
            <Tabs.Content value="partners">
              <PartnersSection />
            </Tabs.Content>
            <Tabs.Content value="fixed-assets">
              <FixedAssetsSection />
            </Tabs.Content>
            <Tabs.Content value="restock">
              <RestockSection />
            </Tabs.Content>
            <Tabs.Content value="packaging">
              <PackagingSection />
            </Tabs.Content>
            <Tabs.Content value="marketing">
              <MarketingSection />
            </Tabs.Content>
            <Tabs.Content value="operational">
              <OperationalSection />
            </Tabs.Content>
            <Tabs.Content value="cash-book">
              <CashBookSection />
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Accounting",
  icon: CurrencyDollar,
  rank: 6,
})

export default AccountingPage
