import BadgeWithTooltip from 'components/lib/BadgeWithTooltip.tsx';
import { getMetricType } from 'models/MetricType.ts';

export function createMetricBadge(metricKey: string) {
  const metricType = getMetricType(metricKey);
  if (!metricType) {
    return null;
  }
  return <BadgeWithTooltip key={metricKey} name={metricType.displayName} tooltip={metricType.description} />;
}
