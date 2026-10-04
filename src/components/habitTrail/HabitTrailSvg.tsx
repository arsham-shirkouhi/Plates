// HABIT TRAIL
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { HabitChain } from '../../habitChains/types';
import { stoneA11yLabel } from '../../habitTrail/selectors';
import { buildTrailGeom, COMPACT_RADIUS, EXPANDED_RADIUS, Point } from '../../habitTrail/trailLayout';
import { HabitTrailState } from '../../habitTrail/types';

interface HabitTrailSvgProps {
  chains: HabitChain[];
  trailState?: HabitTrailState;
  width: number;
  gap: number;
  expanded?: boolean;
  pulse: Animated.Value;
  onStonePress?: (chainId: string) => void;
  onSelectChain?: (chainId: string) => void;
}

export const HabitTrailSvg: React.FC<HabitTrailSvgProps> = ({
  chains,
  trailState,
  width,
  gap,
  expanded = false,
  pulse,
  onStonePress,
  onSelectChain,
}) => {
  const geom = buildTrailGeom(chains, width, gap, trailState);
  const radius = expanded ? EXPANDED_RADIUS : COMPACT_RADIUS;
  const pulseScale = useRef(1);
  const [, force] = React.useState(0);

  useEffect(() => {
    const id = pulse.addListener(({ value }) => {
      pulseScale.current = value;
      force((n) => n + 1);
    });
    return () => pulse.removeListener(id);
  }, [pulse]);

  return (
    <View style={{ width: geom.width, height: geom.height }}>
      <Svg width={geom.width} height={geom.height} viewBox={`0 0 ${geom.width} ${geom.height}`}>
        {geom.nodes.map((node, index) => {
          const prev = geom.nodes[index - 1];
          return prev ? (
            <Line
              key={`link-${node.stepId}`}
              x1={prev.x}
              y1={prev.y}
              x2={node.x}
              y2={node.y}
              stroke="#E6E6E6"
              strokeWidth={3}
            />
          ) : null;
        })}
        {geom.nodes.map((node) => {
          const scale = node.status === 'next' ? pulseScale.current : 1;
          const r = radius * scale;
          const labelSide = node.x < width / 2 ? node.x + r + 8 : node.x - r - 8;
          const anchor = node.x < width / 2 ? 'start' : 'end';
          return (
            <G
              key={node.stepId}
              accessible
              accessibilityLabel={stoneA11yLabel(
                { name: node.chainName } as HabitChain,
                node.stepTitle,
                node.status
              )}
              onPress={
                node.status === 'next'
                  ? () => onStonePress?.(node.chainId)
                  : () => onSelectChain?.(node.chainId)
              }
            >
              {node.isChainStart && (
                <SvgText
                  x={labelSide}
                  y={node.y - r - 4}
                  fontSize={expanded ? 11 : 8}
                  fill="#252525"
                  textAnchor={anchor}
                >
                  {node.chainName}
                </SvgText>
              )}
              {node.status === 'done' && (
                <>
                  <Circle cx={node.x} cy={node.y} r={r} fill="#58CC02" />
                  <Path
                    d={`M ${node.x - r * 0.4} ${node.y} L ${node.x - r * 0.1} ${node.y + r * 0.32} L ${node.x + r * 0.42} ${node.y - r * 0.28}`}
                    stroke="#FFFFFF"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </>
              )}
              {node.status === 'next' && (
                <>
                  <Circle cx={node.x} cy={node.y} r={r + 3} fill="#FFF3BF" />
                  <Circle cx={node.x} cy={node.y} r={r} fill="#F9C117" stroke="#252525" strokeWidth={2} />
                </>
              )}
              {node.status === 'locked' && (
                <>
                  <Circle cx={node.x} cy={node.y} r={r} fill="#EFEFEF" />
                  <Circle cx={node.x} cy={node.y} r={2.2} fill="#BDBDBD" />
                </>
              )}
              {node.hasChest && (
                <Rect x={node.x + r + 4} y={node.y - 4} width={8} height={6} rx={1} fill="#F9C117" stroke="#252525" strokeWidth={0.8} />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

export const createPulse = () => {
  const pulse = new Animated.Value(1);
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ])
  );
  return { pulse, loop };
};

export const animateAvatarHop = (
  from: Point,
  to: Point,
  reduceMotion: boolean,
  onUpdate: (point: Point) => void,
  onDone: () => void
) => {
  if (reduceMotion) {
    onUpdate(to);
    onDone();
    return;
  }
  const progress = new Animated.Value(0);
  const listener = progress.addListener(({ value }) => {
    onUpdate({
      x: from.x + (to.x - from.x) * value,
      y: from.y + (to.y - from.y) * value,
    });
  });
  Animated.timing(progress, {
    toValue: 1,
    duration: 320,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  }).start(() => {
    progress.removeListener(listener);
    onUpdate(to);
    onDone();
  });
};
