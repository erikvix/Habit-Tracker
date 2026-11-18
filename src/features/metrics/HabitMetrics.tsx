import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { efficiencyPercent } from '@/domain/efficiency';
import { monthKey } from '@/domain/localDate';
import type { HabitHistory, LocalDate, MonthKey } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { BarChart } from '@/ui/components/BarChart';
import { Card } from '@/ui/components/Card';
import { MonthSwitcher } from '@/ui/components/MonthSwitcher';
import { StatCard } from '@/ui/components/StatCard';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { fonts, space } from '@/ui/theme/tokens';

import { monthAbbr } from '../shared/model';
import { efficiencyLevel, habitStats, minSelectableMonth } from './model';

const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

interface Props {
  history: HabitHistory;
  today: LocalDate;
  /** Início do período "último ano" (o mesmo do grid). */
  yearFrom: LocalDate;
  totalCommits: number | null;
}

/** Sequências, totais e eficiência mensal (número + barras dos últimos 12 meses). */
export function HabitMetrics({ history, today, yearFrom, totalCommits }: Props) {
  const { colors } = useTheme();
  const current = monthKey(today);
  const minMonth = minSelectableMonth(today);
  const [month, setMonth] = useState<MonthKey>(current);
  const stats = useMemo(
    () => habitStats(history, today, month, yearFrom),
    [history, today, month, yearFrom],
  );
  const pct = efficiencyPercent(stats.month.efficiency);
  const isTime = history.habit.goalType === 'time';

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <StatCard
          icon="flame"
          iconColor={stats.streaks.current > 0 ? colors.attention : undefined}
          label="Sequência atual"
          value={days(stats.streaks.current)}
        />
        <StatCard icon="trophy" label="Maior sequência" value={days(stats.streaks.longest)} />
        <StatCard
          icon="git-commit"
          label="Commits no último ano"
          value={totalCommits === null ? '…' : String(totalCommits)}
        />
        {isTime ? (
          <StatCard icon="clock" label="Minutos no último ano" value={String(stats.minutes)} />
        ) : null}
      </View>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Eficiência mensal</AppText>
        <MonthSwitcher month={month} onChange={setMonth} max={current} min={minMonth} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText
            style={{
              fontFamily: fonts.mono,
              fontSize: 36,
              fontWeight: '600',
              color: pct === null ? colors.textMuted : colors.text,
            }}
          >
            {pct === null ? '—' : `${pct}%`}
          </AppText>
          <AppText variant="caption">
            {stats.month.activeDays === 0
              ? 'Nenhum dia ativo neste mês'
              : `${stats.month.metDays} de ${days(stats.month.activeDays)} ativos com a meta cumprida`}
          </AppText>
        </View>
        <BarChart
          accessibilityLabel="Eficiência nos últimos 12 meses"
          points={stats.series.map((m) => ({
            key: m.month,
            label: monthAbbr(m.month),
            value: m.efficiency,
            level: efficiencyLevel(m.efficiency),
          }))}
          selectedKey={month}
          onSelect={(m) => {
            if (m <= current && m >= minMonth) setMonth(m);
          }}
        />
      </Card>
    </View>
  );
}
