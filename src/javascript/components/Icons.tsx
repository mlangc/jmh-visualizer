import Tooltipped from 'components/lib/Tooltipped.tsx';
import { yellow } from 'functions/colors.ts';
import type BenchmarkBundle from 'models/BenchmarkBundle.ts';
import type { IconType } from 'react-icons';
import {
  FaBug as BugIcon,
  FaSearchPlus as DetailsIcon,
  FaGithub as GithubIcon,
  FaExternalLinkAlt as LinkIcon,
  FaBalanceScale as ScaleIcon,
  FaSortAmountDown as SortIcon
} from 'react-icons/fa';
import { actions } from 'store/store.ts';

export { BugIcon, GithubIcon, LinkIcon };

const activeColor = yellow;

interface ToggleButtonProps {
  active: boolean;
  action: () => void;
}

export const SortButton = ({ active, action }: ToggleButtonProps) => {
  return <IconButton IconName={SortIcon} tooltip="Sort by Score/Name" active={active} action={action} />;
};

export const ScaleButton = ({ active, action }: ToggleButtonProps) => {
  return <IconButton IconName={ScaleIcon} tooltip="Switch scale (log/linear)" active={active} action={action} />;
};

export const DetailsButton = ({ benchmarkBundle }: { benchmarkBundle: BenchmarkBundle }) => {
  const secondaryMetrics = new Set<string>();
  benchmarkBundle.allBenchmarks().forEach((benchmark) => {
    Object.keys(benchmark.secondaryMetrics).forEach((secondaryMetric) => {
      secondaryMetrics.add(secondaryMetric);
    });
  });

  return (
    <IconButton
      IconName={DetailsIcon}
      tooltip={`Show details with ${secondaryMetrics.size} secondary metrics results`}
      active={false}
      action={() => actions.detailBenchmarkBundle(benchmarkBundle.key)}
    />
  );
};

interface IconButtonProps extends ToggleButtonProps {
  IconName: IconType;
  tooltip: string;
}

function IconButton({ IconName, tooltip, active, action }: IconButtonProps) {
  const color = active ? activeColor : undefined;
  return (
    <Tooltipped key={'ScaleButton'} tooltip={tooltip} position="top">
      <IconName size={'1em'} onClick={action} color={color} className="clickable" />
    </Tooltipped>
  );
}
