import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { colors } from '../theme';

const N = 120;

/** Die letzten 2 Minuten CPU, RAM und GPU, rechts das Neueste. */
export function Chart({ cpu, ram, gpu }: { cpu: number[]; ram: number[]; gpu: number[] }) {
  const line = (data: number[], color: string) => {
    if (!data?.length) return null;
    const x0 = 300 - (data.length - 1) * (300 / (N - 1));
    const points = data.map((v, i) => `${(x0 + (i * 300) / (N - 1)).toFixed(1)},${(100 - Math.min(100, v)).toFixed(1)}`).join(' ');
    return <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />;
  };
  return (
    <View style={{ height: 110 }}>
      <Svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
        {[25, 50, 75].map(y => <Line key={y} x1={0} x2={300} y1={y} y2={y} stroke={colors.line} strokeWidth={1} />)}
        {line(gpu, colors.good)}
        {line(ram, colors.accent2)}
        {line(cpu, colors.accent)}
      </Svg>
    </View>
  );
}
