import { createMetricBadge } from 'components/commons.tsx';

import Tooltipped from 'components/lib/Tooltipped.tsx';
import { getUniqueBenchmarkModes } from 'functions/parse.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type MetricExtractor from 'models/MetricExtractor.ts';
import type { ReactElement, ReactNode } from 'react';

interface ChartHeaderProps {
  benchmarkBundle: BenchmarkBundle;
  metricExtractor: MetricExtractor;
  children: ReactElement | ReactElement[];
}

//The header of a Single/Two/Multi-RunBundle
const ChartHeader = ({ benchmarkBundle, metricExtractor, children }: ChartHeaderProps) => {
  children = Array.isArray(children) ? children : [children];
  const benchmarkModes = getUniqueBenchmarkModes(benchmarkBundle, metricExtractor);
  const benchmarkModeBadges = benchmarkModes.map((mode) => createMetricBadge(mode));

  return (
    <Header fullName={benchmarkBundle.key} name={benchmarkBundle.name} badges={benchmarkModeBadges}>
      {children.map((child) => {
        return (
          <span key={child.key} className="superscript">
            {' | '}
            {child}
          </span>
        );
      })}
    </Header>
  );
};

interface ChartDetailHeaderProps {
  name: string;
  badges: ReactNode;
  children?: ReactNode;
}

export const ChartDetailHeader = ({ name, badges, children }: ChartDetailHeaderProps) => {
  return (
    <Header fullName={''} name={name} badges={badges}>
      {children}
    </Header>
  );
};

interface HeaderProps extends ChartDetailHeaderProps {
  fullName: string;
}

function Header({ fullName, name, badges, children }: HeaderProps) {
  return (
    <h3 id={fullName}>
      <Tooltipped tooltip={fullName} position="right" disabled={fullName.length === 0}>
        <span>{name}</span>
      </Tooltipped>{' '}
      <span className="superscript">{badges}</span>
      {children}
    </h3>
  );
}

export default ChartHeader;
