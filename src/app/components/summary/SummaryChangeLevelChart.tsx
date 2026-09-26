import type { BenchmarkDiff } from 'components/summary/SummaryView.tsx';
import { green, red, tooltipBackground, yellow } from 'functions/colors.ts';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

interface SummaryChangeLevelChartProps {
  benchmarkDiffs: BenchmarkDiff[];
  minDeviation: number;
}

type LevelObject = ReturnType<typeof levelObject>;

// A Radar chart giving a quick overview on of the severity of all increases/decrease
const SummaryChangeLevelChart = ({ minDeviation, benchmarkDiffs }: SummaryChangeLevelChartProps) => {
  const benchmarkDiffLevels = benchmarkDiffs.reduce(
    (levelTracker: Record<string, LevelObject>, benchmarkDiff) => {
      const levelOfImprovement = getLevelOfImprovement(minDeviation, benchmarkDiff.scoreDiff);
      const levelOfDecline = getLevelOfDecline(minDeviation, benchmarkDiff.scoreDiff);
      if (levelOfImprovement > 0) {
        levelTracker[`level${levelOfImprovement}`].increase++;
      }
      if (levelOfDecline > 0) {
        levelTracker[`level${levelOfDecline}`].decrease++;
      }
      return levelTracker;
    },
    {
      level1: levelObject(minDeviation, 1),
      level2: levelObject(minDeviation, 2),
      level3: levelObject(minDeviation, 3),
      level4: levelObject(minDeviation, 4),
      level5: levelObject(minDeviation, 5)
    }
  );

  const data = Object.keys(benchmarkDiffLevels).map((key) => benchmarkDiffLevels[key]);
  const cx = '50%';
  const maxChangeCount = data.reduce((maxChange, levelObject) => {
    const change = Math.max(levelObject.increase, levelObject.decrease);
    return Math.max(maxChange, change);
  }, 0);

  return (
    <ResponsiveContainer width="100%" height={150}>
      <RadarChart cx={cx} cy={'54%'} outerRadius={58} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis domain={[0, maxChangeCount]} />
        <Radar name="Improvement" dataKey="increase" stroke={green} fill={green} fillOpacity={0.6} />
        <Radar name="Decline" dataKey="decrease" stroke={red} fill={red} fillOpacity={0.6} />
        <Tooltip
          offset={10}
          position={{ x: 45, y: 144 }}
          cursor={{ stroke: yellow, strokeWidth: 2 }}
          wrapperStyle={{ backgroundColor: tooltipBackground, opacity: 0.95 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default SummaryChangeLevelChart;

function levelObject(minDeviation: number, level: number) {
  const min = minDeviation + (level - 1) * 10;
  return {
    name: `${min}+%`,
    increase: 0,
    decrease: 0
  };
}

function getLevelOfImprovement(minDeviation: number, scoreDiff: number) {
  if (scoreDiff < minDeviation) return 0;
  for (let level = 1; level < 6; level++) {
    const levelMax = minDeviation + level * 10;
    if (scoreDiff < levelMax) {
      return level;
    }
  }
  return 5;
}

function getLevelOfDecline(minDeviation: number, scoreDiff: number) {
  if (scoreDiff > -minDeviation) return 0;
  for (let level = 1; level < 6; level++) {
    const levelMax = -minDeviation - level * 10;
    if (scoreDiff > levelMax) {
      return level;
    }
  }
  return 5;
}
