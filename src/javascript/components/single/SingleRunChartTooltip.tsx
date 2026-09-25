import BarTooltipLabel from 'components/single/BarTooltipLabel.tsx';
import { blue, red } from 'functions/colors.ts';
import { formatNumber, round } from 'functions/util.ts';
import { Component, type ReactNode } from 'react';
import Table from 'react-bootstrap/Table';
import { Bar, BarChart, LabelList, type TooltipProps, XAxis, YAxis } from 'recharts';

// label and payload are injected by recharts' Tooltip
interface SingleRunChartTooltipProps {
  label?: string;
  paramNames: string[];
  scoreUnit: string | undefined;
  roundScores: boolean;
  payload?: TooltipProps<number, string>['payload'];
}

export default class SingleRunChartTooltip extends Component<SingleRunChartTooltipProps> {
  render() {
    const { label, payload, scoreUnit, roundScores, paramNames } = this.props;
    if (!payload || payload.length === 0) {
      return null;
    }

    // Assemble table headers showing score, error, etc...
    const tableHeaders: ReactNode[] = [];
    if (payload.length > 1) {
      tableHeaders.push(<th key="1">{paramNames.join(':')}</th>);
    }
    tableHeaders.push(<th key="2">Score</th>);
    tableHeaders.push(<th key="3">Min</th>);
    tableHeaders.push(<th key="4">Max</th>);
    tableHeaders.push(<th key="5">Error</th>);
    tableHeaders.push(<th key="7">Unit</th>);

    // Assemble table rows showing score, error, etc... per bar
    const tableRows = payload.map((barPayload) => {
      const score = formatNumber(barPayload.payload[barPayload.dataKey!], roundScores);
      const minMax = barPayload.payload[`${barPayload.dataKey}MinMax`];
      const min = formatNumber(minMax[0], roundScores);
      const max = formatNumber(minMax[1], roundScores);
      const columnValues: ReactNode[] = [];
      if (payload.length > 1) {
        columnValues.push(<td key="run">{barPayload.dataKey}</td>);
      }
      columnValues.push(
        <td key="score" style={{ color: blue }}>
          {score}
        </td>
      );
      columnValues.push(
        <td key="min" style={{ color: blue }}>
          {min}
        </td>
      );
      columnValues.push(
        <td key="max" style={{ color: blue }}>
          {max}
        </td>
      );
      columnValues.push(
        <td key="error" style={{ color: red }}>
          {formatNumber(barPayload.payload[`${barPayload.dataKey}Error`], roundScores)}
        </td>
      );
      columnValues.push(<td key="unit">{scoreUnit}</td>);
      return <tr key={barPayload.name}>{columnValues}</tr>;
    });

    //Assemble iteration charts showing the raw iteration data per run
    const iterationCharts = payload.map((barPayload) => {
      const forkScores: number[][] | undefined = barPayload.payload[`${barPayload.dataKey}SubScores`];
      const forkHistograms: [number, number][][][] | undefined =
        barPayload.payload[`${barPayload.dataKey}SubScoresHistogram`];
      if (forkHistograms) {
        const tooltipWidth = forkHistograms[0].length * 54;
        return forkHistograms
          .filter((_elem, i) => i < 2)
          .map((forkData, forkIndex) => {
            const histogramCharts = forkData
              .filter((_elem, sampleRunIndex) => sampleRunIndex < 2)
              .map((sampleRuns, runIndex) => {
                const sampleRunData = sampleRuns.map((pair) => {
                  return {
                    score: pair[0],
                    occurence: pair[1]
                  };
                });
                return (
                  <BarChart
                    key={`chart${forkIndex}-${runIndex}`}
                    width={tooltipWidth}
                    height={63}
                    data={sampleRunData}
                    margin={{ top: 18 }}
                  >
                    <XAxis dataKey="score" orientation="bottom" height={15} />
                    <YAxis />
                    <Bar dataKey="occurence" fill={barPayload.fill} isAnimationActive={false} />
                  </BarChart>
                );
              });
            return (
              <div key={`fork${forkIndex}`}>
                <br />
                <div>
                  <b>{`Fork ${forkIndex} / ${forkHistograms.length}`}</b>
                </div>
                <div>{histogramCharts}</div>
                <div>{`Showing ${histogramCharts.length}  runs from ${forkHistograms[forkIndex].length} ...`}</div>
              </div>
            );
          });
      }
      if (forkScores) {
        const forkScoreDatas = forkScores.map((iterationScoreArray) => {
          return iterationScoreArray.map((element) => {
            return {
              data: round(element, roundScores)
            };
          });
        });
        const tooltipWidth = forkScores[0].length * 54;

        return forkScoreDatas.map((data, index) => (
          <div key={`iterations${index}`}>
            <BarChart width={tooltipWidth} height={36} data={data} margin={{ top: 18 }}>
              <Bar dataKey="data" fill={barPayload.fill} isAnimationActive={false}>
                <LabelList dataKey="data" content={BarTooltipLabel} />
              </Bar>
            </BarChart>
          </div>
        ));
      }
      return null;
    });

    return (
      <div>
        <div style={{ textAlign: 'center' }}>
          <u>
            <h4>{label}</h4>
          </u>
        </div>
        <Table striped bordered size="sm" hover>
          <thead>
            <tr>{tableHeaders}</tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </Table>
        <div style={{ textAlign: 'center' }}>
          <u>
            <h5>Raw Data</h5>
          </u>
        </div>
        <div style={{ fontSize: '0.72em' }}>{iterationCharts}</div>
        <br />
      </div>
    );
  }
}
