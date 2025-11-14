import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import analyticsData from '../data/mockAnalytics.json';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Period = 'today' | 'thisWeek' | 'thisMonth';

export function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');

  const currentStats =
    analyticsData.transmissionStats[selectedPeriod];

  const renderBarChart = (
    data: Array<{ label: string; value: number; color: string }>,
    maxValue: number
  ) => {
    return (
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barItem}>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderLineChart = (
    data: Array<{ timestamp: string; fps: number; target: number }>
  ) => {
    const maxFps = Math.max(...data.map(d => Math.max(d.fps, d.target)));
    const chartHeight = 120;

    return (
      <View style={styles.lineChartContainer}>
        <View style={styles.lineChart}>
          {data.map((point, index) => {
            const height = (point.fps / maxFps) * chartHeight;
            const targetHeight = (point.target / maxFps) * chartHeight;

            return (
              <View key={index} style={styles.linePoint}>
                <View
                  style={[
                    styles.targetLine,
                    { height: targetHeight, bottom: 0 },
                  ]}
                />
                <View style={[styles.fpsBar, { height }]} />
              </View>
            );
          })}
        </View>
        <View style={styles.lineChartLabels}>
          {data.map((point, index) =>
            index % 2 === 0 ? (
              <Text key={index} style={styles.lineChartLabel}>
                {point.timestamp}
              </Text>
            ) : null
          )}
        </View>
      </View>
    );
  };

  const renderNetworkChart = () => {
    const maxValue = Math.max(
      ...analyticsData.networkUsage.map(d => d.sent)
    );
    const chartHeight = 100;

    return (
      <View style={styles.networkChartContainer}>
        <View style={styles.networkChart}>
          {analyticsData.networkUsage.map((item, index) => {
            const sentHeight = (item.sent / maxValue) * chartHeight;

            return (
              <View key={index} style={styles.networkBar}>
                <View
                  style={[styles.networkBarSent, { height: sentHeight }]}
                />
                <Text style={styles.networkLabel}>{item.hour}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.networkLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#2196F3' }]}
            />
            <Text style={styles.legendText}>전송 (MB)</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>분석</Text>
        <Text style={styles.subtitle}>전송 통계 및 성능 분석</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'today' && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod('today')}>
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'today' && styles.periodButtonTextActive,
            ]}>
            오늘
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'thisWeek' && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod('thisWeek')}>
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'thisWeek' && styles.periodButtonTextActive,
            ]}>
            이번 주
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'thisMonth' && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod('thisMonth')}>
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'thisMonth' && styles.periodButtonTextActive,
            ]}>
            이번 달
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {currentStats.totalFrames.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>총 프레임</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {currentStats.successRate}%
          </Text>
          <Text style={styles.statLabel}>성공률</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{currentStats.averageLatency}ms</Text>
          <Text style={styles.statLabel}>평균 지연시간</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{currentStats.averageFps}</Text>
          <Text style={styles.statLabel}>평균 FPS</Text>
        </View>
      </View>

      {/* Success vs Failed */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>전송 성공/실패</Text>
        {renderBarChart(
          [
            {
              label: '성공',
              value: currentStats.successfulFrames,
              color: '#4CAF50',
            },
            {
              label: '실패',
              value: currentStats.failedFrames,
              color: '#F44336',
            },
          ],
          currentStats.totalFrames
        )}
      </View>

      {/* FPS History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FPS 히스토리</Text>
        <Text style={styles.cardSubtitle}>
          실제 FPS vs 목표 FPS (최근 10개)
        </Text>
        {renderLineChart(analyticsData.fpsHistory)}
        <View style={styles.fpsLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: '#2196F3' }]}
            />
            <Text style={styles.legendText}>실제 FPS</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                { backgroundColor: '#FFC107', opacity: 0.3 },
              ]}
            />
            <Text style={styles.legendText}>목표 FPS</Text>
          </View>
        </View>
      </View>

      {/* Network Usage */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>네트워크 사용량</Text>
        <Text style={styles.cardSubtitle}>시간별 데이터 전송량 (MB)</Text>
        {renderNetworkChart()}
      </View>

      {/* Connection Uptime */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>연결 안정성 (최근 7일)</Text>
        <View style={styles.uptimeContainer}>
          {analyticsData.connectionHistory.map((item, index) => (
            <View key={index} style={styles.uptimeItem}>
              <Text style={styles.uptimeDate}>{item.date}</Text>
              <View style={styles.uptimeBarContainer}>
                <View
                  style={[
                    styles.uptimeBar,
                    {
                      width: `${item.uptime}%`,
                      backgroundColor:
                        item.uptime > 95 ? '#4CAF50' : '#FF9800',
                    },
                  ]}
                />
              </View>
              <Text style={styles.uptimeValue}>{item.uptime}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Error Log */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 오류 로그</Text>
        {analyticsData.errorLog.map((error, index) => (
          <View key={index} style={styles.errorItem}>
            <View
              style={[
                styles.errorDot,
                {
                  backgroundColor:
                    error.severity === 'error'
                      ? '#F44336'
                      : error.severity === 'warning'
                        ? '#FF9800'
                        : '#2196F3',
                },
              ]}
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorMessage}>{error.message}</Text>
              <Text style={styles.errorTime}>
                {new Date(error.timestamp).toLocaleString('ko-KR')}
              </Text>
            </View>
            {error.resolved && (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>해결됨</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 16,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: 60,
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 50,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  barValue: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  lineChartContainer: {
    marginTop: 16,
  },
  lineChart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  linePoint: {
    flex: 1,
    height: '100%',
    marginHorizontal: 2,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  targetLine: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#FFC107',
    opacity: 0.3,
  },
  fpsBar: {
    width: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  lineChartLabel: {
    fontSize: 10,
    color: '#999',
  },
  fpsLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  networkChartContainer: {
    marginTop: 16,
  },
  networkChart: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  networkBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  networkBarSent: {
    width: 20,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  networkLabel: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
  },
  networkLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  uptimeContainer: {
    marginTop: 8,
  },
  uptimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  uptimeDate: {
    width: 50,
    fontSize: 12,
    color: '#666',
  },
  uptimeBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  uptimeBar: {
    height: '100%',
    borderRadius: 4,
  },
  uptimeValue: {
    width: 50,
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  errorContent: {
    flex: 1,
  },
  errorMessage: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  errorTime: {
    fontSize: 11,
    color: '#999',
  },
  resolvedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resolvedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});
