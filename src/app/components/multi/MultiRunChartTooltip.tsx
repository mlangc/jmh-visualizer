import { blue, red } from 'functions/colors.ts';
import { formatNumber } from 'functions/util.ts';
import { Component } from 'react';
import Table from 'react-bootstrap/Table';
import type { TooltipProps } from 'recharts';

// label and payload are injected by recharts' Tooltip
interface MultiRunChartTooltipProps {
  label?: string;
  roundScores: boolean;
  payload?: TooltipProps<number, string>['payload'];
}

// Tooltip for LineChartView
export default class MultiRunChartTooltip extends Component<MultiRunChartTooltipProps> {
  render() {
    const { label, payload, roundScores } = this.props;
    if (payload!.length === 0) {
      return null;
    }
    const tableRows = payload!.map((dataPoint) => (
      <tr key={dataPoint.name}>
        <td>{dataPoint.name}</td>
        <td style={{ color: blue }}>{formatNumber(dataPoint.value, roundScores)}</td>
        <td style={{ color: blue }}>{formatNumber(dataPoint.payload[`${dataPoint.name}-minMax`][0], roundScores)}</td>
        <td style={{ color: blue }}>{formatNumber(dataPoint.payload[`${dataPoint.name}-minMax`][1], roundScores)}</td>
        <td style={{ color: red }}>{formatNumber(dataPoint.payload[`${dataPoint.name}-scoreError`], roundScores)}</td>
        <td>{dataPoint.payload.scoreUnit}</td>
      </tr>
    ));
    return (
      <div>
        <div style={{ textAlign: 'center' }}>
          <h4>
            <u>{label}</u>
          </h4>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Table striped bordered size="sm" hover>
            <thead>
              <tr>
                <th>Benchmark</th>
                <th>Score</th>
                <th>Min</th>
                <th>Max</th>
                <th>Score Error</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>{tableRows}</tbody>
          </Table>
        </div>
      </div>
    );
  }
}
