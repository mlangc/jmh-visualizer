import Tooltipped from 'components/lib/Tooltipped.tsx';
import type { BenchmarkDiff } from 'components/summary/SummaryView.tsx';
import { green, red, yellow } from 'functions/colors.ts';
import type { ReactNode } from 'react';
import Table from 'react-bootstrap/Table';
import { FaLocationArrow as UpIcon } from 'react-icons/fa';
import { actions } from 'store/store.ts';

interface SummaryTableProps {
  name: string;
  benchmarkDiffs: BenchmarkDiff[];
  lastRunIndex: number;
}

const SummaryTable = ({ name, benchmarkDiffs, lastRunIndex }: SummaryTableProps) => {
  if (benchmarkDiffs.length === 0) {
    return null;
  }

  const headers = ['#', 'Benchmark', 'Params', 'Mode/Unit', 'Score', 'Error'].map((header) => (
    <th key={header}>{header}</th>
  ));

  const rows = benchmarkDiffs.map((benchmarkDiff, i) => {
    let color: string;
    let icon: ReactNode;
    if (benchmarkDiff.scoreDiff === 0) {
      color = yellow;
      icon = <UpIcon transform="rotate(45)" />;
    } else if (benchmarkDiff.scoreDiff > 0) {
      color = green;
      icon = <UpIcon />;
    } else {
      color = red;
      icon = <UpIcon transform="rotate(90)" />;
    }

    return (
      <tr key={i}>
        <td>{i}</td>
        <td>
          <Tooltipped tooltip={`${benchmarkDiff.bundleKey}#${benchmarkDiff.benchmarkMethod.name}()`} position="right">
            <span className="clickable" onClick={() => actions.detailBenchmarkBundle(benchmarkDiff.bundleKey)}>
              {`${benchmarkDiff.bundleName} - ${benchmarkDiff.benchmarkMethod.name} `}
              <span style={{ color: color }}>
                {icon} {benchmarkDiff.scoreDiff}%
              </span>
            </span>
          </Tooltipped>
        </td>
        <td>
          {benchmarkDiff.benchmarkMethod.params
            ? benchmarkDiff.benchmarkMethod.params.map((param) => `${param[0]}=${param[1]}`).join(':')
            : ''}
        </td>
        <td>{`${benchmarkDiff.benchmarkMethod.benchmarks[lastRunIndex]!.mode} in ${benchmarkDiff.scoreUnit}`}</td>
        <td>
          <div>{benchmarkDiff.score1stRun.toLocaleString()}</div>
          <div>{benchmarkDiff.score2ndRun.toLocaleString()}</div>
        </td>
        <td>
          <div>{benchmarkDiff.scoreError1stRun.toLocaleString()}</div>
          <div>{benchmarkDiff.scoreError2ndRun.toLocaleString()}</div>
        </td>
      </tr>
    );
  });

  return (
    <div>
      <h3>{`${name} (${benchmarkDiffs.length})`}</h3>
      <Table striped>
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </div>
  );
};

export default SummaryTable;
