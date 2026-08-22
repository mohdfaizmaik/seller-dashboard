import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  IndianRupee,
  Package,
  ShoppingBag,
  Eye,
  Users,
  Percent,
  Store
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import {
  getMarketplaceDailyMetrics,
  getMarketplacePerformanceData,
  resolveMarketplaceDateRange
} from '../services/marketplaceReportService';
import { MARKETPLACE_ORDER_ITEMS_LABEL } from '../data/marketplace/marketplacePerformanceLabels';
import type { MarketplaceDailyMetric, MarketplacePlatform } from '../models/marketplaceReport';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type NullableNumber = number | null;

function sumNullable(rows: MarketplaceDailyMetric[], key: keyof MarketplaceDailyMetric): NullableNumber {
  let total = 0;
  let hasValue = false;
  for (const row of rows) {
    const value = row[key];
    if (typeof value === 'number') {
      total += value;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

/** Session-weighted average for rate metrics; returns null if not computable. */
function weightedRate(
  rows: MarketplaceDailyMetric[],
  rateKey: 'featuredOfferPercentage' | 'unitSessionPercentage',
  weightKey: 'sessions' | 'pageViews' = 'sessions'
): NullableNumber {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const row of rows) {
    const rate = row[rateKey];
    const weight = row[weightKey];
    if (rate !== null && weight !== null && weight > 0) {
      weightedSum += rate * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/** Simple mean of daily values; null if no values present. */
function averageNullable(rows: MarketplaceDailyMetric[], key: keyof MarketplaceDailyMetric): NullableNumber {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const value = row[key];
    if (typeof value === 'number') {
      total += value;
      count += 1;
    }
  }
  return count > 0 ? total / count : null;
}

function formatINR(value: NullableNumber): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: NullableNumber): string {
  if (value === null) return 'N/A';
  return value.toLocaleString('en-IN');
}

function formatPercent(value: NullableNumber, digits = 2): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(digits)}%`;
}

function formatDateTick(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateLabel(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildSalesTrend(rows: MarketplaceDailyMetric[]) {
  const byDate = new Map<string, { date: string; amazonSales: number | null; flipkartSales: number | null }>();

  for (const row of rows) {
    const entry = byDate.get(row.date) ?? {
      date: row.date,
      amazonSales: null,
      flipkartSales: null
    };
    if (row.platform === 'amazon') {
      entry.amazonSales = row.orderedProductSales;
    } else {
      entry.flipkartSales = row.orderedProductSales;
    }
    byDate.set(row.date, entry);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildTrafficTrend(rows: MarketplaceDailyMetric[]) {
  const byDate = new Map<string, {
    date: string;
    amazonSessions: number | null;
    flipkartSessions: number | null;
    amazonPageViews: number | null;
    flipkartPageViews: number | null;
  }>();

  for (const row of rows) {
    const entry = byDate.get(row.date) ?? {
      date: row.date,
      amazonSessions: null,
      flipkartSessions: null,
      amazonPageViews: null,
      flipkartPageViews: null
    };
    if (row.platform === 'amazon') {
      entry.amazonSessions = row.sessions;
      entry.amazonPageViews = row.pageViews;
    } else {
      entry.flipkartSessions = row.sessions;
      entry.flipkartPageViews = row.pageViews;
    }
    byDate.set(row.date, entry);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function platformLabel(platform: MarketplacePlatform): string {
  return platform === 'amazon' ? 'Amazon' : 'Flipkart';
}

function platformColor(platform: MarketplacePlatform): string {
  return platform === 'amazon' ? 'var(--color-amazon)' : 'var(--color-flipkart)';
}

export const MarketplacePerformance: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();

  // Same date-range semantics as the rest of the app (getDateRangeFromPreset via resolveMarketplaceDateRange).
  const { startDate: rangeStart, endDate: rangeEnd } = resolveMarketplaceDateRange(
    preset,
    startDate,
    endDate
  );

  // Phase 5D: Local data computed synchronously for immediate rendering.
  const localMetrics = getMarketplaceDailyMetrics(platform, rangeStart, rangeEnd);

  // Async backend-enhanced state (Amazon backend → preferred, local → fallback).
  const [enhancedData, setEnhancedData] = React.useState<{
    metrics: MarketplaceDailyMetric[];
    amazonSource: 'backend' | 'local';
  } | null>(null);
  const [backendLoading, setBackendLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setEnhancedData(null);

    const needsBackend = platform === 'all' || platform === 'amazon';
    if (!needsBackend) {
      setBackendLoading(false);
      return;
    }

    setBackendLoading(true);

    getMarketplacePerformanceData(platform, rangeStart, rangeEnd)
      .then((result) => {
        if (!cancelled) {
          setEnhancedData(result);
          setBackendLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [platform, rangeStart, rangeEnd]);

  // Use backend-enhanced data when available, otherwise local
  const metrics = enhancedData?.metrics ?? localMetrics;
  const amazonSource = enhancedData?.amazonSource ?? 'local';

  const amazonRows = metrics.filter((m) => m.platform === 'amazon');
  const flipkartRows = metrics.filter((m) => m.platform === 'flipkart');
  const showAmazon = platform === 'all' || platform === 'amazon';
  const showFlipkart = platform === 'all' || platform === 'flipkart';

  const totalSales = sumNullable(metrics, 'orderedProductSales');
  const totalUnits = sumNullable(metrics, 'unitsOrdered');
  const totalOrderItems = sumNullable(metrics, 'totalOrderItems');
  const totalSessions = sumNullable(metrics, 'sessions');
  const totalPageViews = sumNullable(metrics, 'pageViews');
  const featuredOfferPct = weightedRate(metrics, 'featuredOfferPercentage');

  const salesTrend = buildSalesTrend(metrics);
  const trafficTrend = buildTrafficTrend(metrics);

  const hasAmazonTraffic = trafficTrend.some(
    (d) => d.amazonSessions !== null || d.amazonPageViews !== null
  );
  const hasFlipkartTraffic = trafficTrend.some(
    (d) => d.flipkartSessions !== null || d.flipkartPageViews !== null
  );
  const hasAnyTraffic = (showAmazon && hasAmazonTraffic) || (showFlipkart && hasFlipkartTraffic);

  const unitSessionPct = weightedRate(metrics, 'unitSessionPercentage');
  const avgOfferCount = averageNullable(metrics, 'averageOfferCount');
  const avgParentItems = averageNullable(metrics, 'averageParentItems');

  const amazonUnitSession = weightedRate(amazonRows, 'unitSessionPercentage');
  const flipkartUnitSession = weightedRate(flipkartRows, 'unitSessionPercentage');
  const amazonFeatured = weightedRate(amazonRows, 'featuredOfferPercentage');
  const flipkartFeatured = weightedRate(flipkartRows, 'featuredOfferPercentage');
  const amazonAvgOffer = averageNullable(amazonRows, 'averageOfferCount');
  const flipkartAvgOffer = averageNullable(flipkartRows, 'averageOfferCount');
  const amazonAvgParent = averageNullable(amazonRows, 'averageParentItems');
  const flipkartAvgParent = averageNullable(flipkartRows, 'averageParentItems');

  const filterSummary = () => {
    let summary = `Platform: ${platform.toUpperCase()} | Range: ${preset.toUpperCase()}`;
    summary += ` (${rangeStart} to ${rangeEnd})`;
    return summary;
  };

  /** Subtle data source status (Phase 5D). */
  const renderSourceIndicator = () => {
    if (!showAmazon) return null;
    if (backendLoading) {
      return (
        <span
          className="text-xs"
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            opacity: 0.85
          }}
        >
          Amazon: Connecting…
        </span>
      );
    }
    return (
      <span
        className="text-xs"
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-md)',
          color: amazonSource === 'backend' ? '#4ade80' : 'var(--text-muted)',
          opacity: 0.85
        }}
      >
        {amazonSource === 'backend' ? '● Amazon: Live' : '● Amazon: Local data'}
      </span>
    );
  };

  const renderPlatformBlock = (rows: MarketplaceDailyMetric[], plat: MarketplacePlatform) => {
    if (rows.length === 0) {
      return (
        <div className="text-xs" style={{ color: 'var(--text-muted)', padding: '8px 0' }}>
          No {platformLabel(plat)} data for this period
        </div>
      );
    }

    const sales = sumNullable(rows, 'orderedProductSales');
    const units = sumNullable(rows, 'unitsOrdered');
    const items = sumNullable(rows, 'totalOrderItems');
    const sessions = sumNullable(rows, 'sessions');
    const pageViews = sumNullable(rows, 'pageViews');
    const featured = weightedRate(rows, 'featuredOfferPercentage');

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px',
          fontSize: '12px'
        }}
      >
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Ordered Product Sales</span>
          <span className="font-medium">{formatINR(sales)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Units Ordered</span>
          <span className="font-medium">{formatNumber(units)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>{MARKETPLACE_ORDER_ITEMS_LABEL}</span>
          <span className="font-medium">{formatNumber(items)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Sessions</span>
          <span className="font-medium">{formatNumber(sessions)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Page Views</span>
          <span className="font-medium">{formatNumber(pageViews)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span style={{ color: 'var(--text-secondary)' }}>Featured Offer %</span>
          <span className="font-medium">{formatPercent(featured)}</span>
        </div>
      </div>
    );
  };

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Marketplace Performance"
          subtitle="Amazon & Flipkart marketplace performance"
          actions={
            <>
              <span
                className="text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                {filterSummary()}
              </span>
              {renderSourceIndicator()}
            </>
          }
        />
        <Card>
          <CardBody
            className="flex items-center justify-center"
            style={{ height: '240px', color: 'var(--text-muted)' }}
          >
            No marketplace data for this period
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Marketplace Performance"
        subtitle="Amazon & Flipkart marketplace performance"
        actions={
          <>
            <span
              className="text-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              {filterSummary()}
            </span>
            {renderSourceIndicator()}
          </>
        }
      />

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)'
        }}
      >
        <Card hoverable>
          <CardHeader>
            <CardTitle>Ordered Product Sales</CardTitle>
            <IndianRupee size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatINR(totalSales)}
            </span>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>Units Ordered</CardTitle>
            <Package size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(totalUnits)}
            </span>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>{MARKETPLACE_ORDER_ITEMS_LABEL}</CardTitle>
            <ShoppingBag size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(totalOrderItems)}
            </span>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <Users size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(totalSessions)}
            </span>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>Page Views</CardTitle>
            <Eye size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatNumber(totalPageViews)}
            </span>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>Featured Offer %</CardTitle>
            <Percent size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatPercent(featuredOfferPct)}
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <div className="grid-equal-2col">
        <Card>
          <CardHeader>
            <CardTitle>Amazon</CardTitle>
            <Badge variant="amazon">Amazon</Badge>
          </CardHeader>
          <CardBody>
            <div style={{ height: '4px', width: '40px', backgroundColor: platformColor('amazon'), borderRadius: 'var(--radius-full)', marginBottom: '12px' }} />
            {renderPlatformBlock(amazonRows, 'amazon')}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flipkart</CardTitle>
            <Badge variant="flipkart">Flipkart</Badge>
          </CardHeader>
          <CardBody>
            <div style={{ height: '4px', width: '40px', backgroundColor: platformColor('flipkart'), borderRadius: 'var(--radius-full)', marginBottom: '12px' }} />
            {renderPlatformBlock(flipkartRows, 'flipkart')}
          </CardBody>
        </Card>
      </div>

      {/* Marketplace Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Sales Trend</CardTitle>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ordered Product Sales</span>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickFormatter={formatDateTick}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                    notation: 'compact'
                  }).format(value)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px'
                }}
                labelFormatter={(label) => formatDateLabel(String(label))}
                formatter={(value, name) => [
                  value == null ? 'N/A' : formatINR(Number(value)),
                  String(name)
                ]}
              />
              <Legend />
              {showAmazon && (
                <Area
                  type="monotone"
                  dataKey="amazonSales"
                  name="Amazon"
                  stroke="var(--color-amazon)"
                  fill="var(--color-amazon)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  connectNulls={false}
                />
              )}
              {showFlipkart && (
                <Area
                  type="monotone"
                  dataKey="flipkartSales"
                  name="Flipkart"
                  stroke="var(--color-flipkart)"
                  fill="var(--color-flipkart)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  connectNulls={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Traffic Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Trend</CardTitle>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sessions &amp; Page Views</span>
        </CardHeader>
        <CardBody>
          {!hasAnyTraffic ? (
            <div
              className="flex flex-col items-center justify-center gap-1 text-xs"
              style={{ height: '240px', color: 'var(--text-muted)' }}
            >
              <span>Traffic data unavailable for this period</span>
              {showFlipkart && !hasFlipkartTraffic && (
                <span>Flipkart sessions / page views: N/A</span>
              )}
            </div>
          ) : (
            <>
              {showFlipkart && !hasFlipkartTraffic && (
                <div className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Flipkart traffic unavailable (N/A) — sessions and page views are not present in the Sales Report
                </div>
              )}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trafficTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={formatDateTick}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px'
                    }}
                    labelFormatter={(label) => formatDateLabel(String(label))}
                    formatter={(value, name) => [
                      value == null ? 'N/A' : formatNumber(Number(value)),
                      String(name)
                    ]}
                  />
                  <Legend />
                  {showAmazon && hasAmazonTraffic && (
                    <Line
                      type="monotone"
                      dataKey="amazonSessions"
                      name="Amazon Sessions"
                      stroke="var(--color-amazon)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {showFlipkart && hasFlipkartTraffic && (
                    <Line
                      type="monotone"
                      dataKey="flipkartSessions"
                      name="Flipkart Sessions"
                      stroke="var(--color-flipkart)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {showAmazon && hasAmazonTraffic && (
                    <Line
                      type="monotone"
                      dataKey="amazonPageViews"
                      name="Amazon Page Views"
                      stroke="var(--color-amazon)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                  {showFlipkart && hasFlipkartTraffic && (
                    <Line
                      type="monotone"
                      dataKey="flipkartPageViews"
                      name="Flipkart Page Views"
                      stroke="var(--color-flipkart)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </CardBody>
      </Card>

      {/* Conversion / Offer Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion &amp; Offer Performance</CardTitle>
          <Store size={16} style={{ color: 'var(--text-muted)' }} />
        </CardHeader>
        <CardBody>
          <div className="grid-equal-2col" style={{ marginBottom: 0 }}>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium" style={{ color: platformColor('amazon') }}>Amazon</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  fontSize: '12px'
                }}
              >
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Unit Session %</span>
                  <span className="font-medium">{formatPercent(amazonUnitSession)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Featured Offer %</span>
                  <span className="font-medium">{formatPercent(amazonFeatured)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Offer Count</span>
                  <span className="font-medium">{formatNumber(amazonAvgOffer !== null ? Math.round(amazonAvgOffer) : null)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Parent Items</span>
                  <span className="font-medium">{formatNumber(amazonAvgParent !== null ? Math.round(amazonAvgParent) : null)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium" style={{ color: platformColor('flipkart') }}>Flipkart</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  fontSize: '12px'
                }}
              >
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Unit Session %</span>
                  <span className="font-medium">{formatPercent(flipkartUnitSession)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Featured Offer %</span>
                  <span className="font-medium">{formatPercent(flipkartFeatured)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Offer Count</span>
                  <span className="font-medium">{formatNumber(flipkartAvgOffer !== null ? Math.round(flipkartAvgOffer) : null)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Parent Items</span>
                  <span className="font-medium">{formatNumber(flipkartAvgParent !== null ? Math.round(flipkartAvgParent) : null)}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="text-xs"
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '8px'
            }}
          >
            <span>Overall Unit Session %: <strong style={{ color: 'var(--text-secondary)' }}>{formatPercent(unitSessionPct)}</strong></span>
            <span>Overall Featured Offer %: <strong style={{ color: 'var(--text-secondary)' }}>{formatPercent(featuredOfferPct)}</strong></span>
            <span>Overall Avg Offer Count: <strong style={{ color: 'var(--text-secondary)' }}>{formatNumber(avgOfferCount !== null ? Math.round(avgOfferCount) : null)}</strong></span>
            <span>Overall Avg Parent Items: <strong style={{ color: 'var(--text-secondary)' }}>{formatNumber(avgParentItems !== null ? Math.round(avgParentItems) : null)}</strong></span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default MarketplacePerformance;
