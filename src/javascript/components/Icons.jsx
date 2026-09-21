import Tooltipped from 'components/lib/Tooltipped.jsx';
import { yellow } from 'functions/colors.js';
import {
  FaBug as BugIcon,
  FaSearchPlus as DetailsIcon,
  FaGithub as GithubIcon,
  FaExternalLinkAlt as LinkIcon,
  FaBalanceScale as ScaleIcon,
  FaSortAmountDown as SortIcon
} from 'react-icons/fa';
import { actions } from 'store/store.js';

export { BugIcon, GithubIcon, LinkIcon };

const activeColor = yellow;
/* eslint react/prop-types: 0 */

export const SortButton = ({ active, action }) => {
  return <IconButton IconName={SortIcon} tooltip="Sort by Score/Name" active={active} action={action} />;
};

export const ScaleButton = ({ active, action }) => {
  return <IconButton IconName={ScaleIcon} tooltip="Switch scale (log/linear)" active={active} action={action} />;
};

export const DetailsButton = ({ benchmarkBundle }) => {
  const secondaryMetrics = new Set();
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

function IconButton({ IconName, tooltip, active, action }) {
  const color = active ? activeColor : null;
  return (
    <Tooltipped key={'ScaleButton'} tooltip={tooltip} position="top">
      <IconName size={'1em'} onClick={action} color={color} className="clickable" />
    </Tooltipped>
  );
}
