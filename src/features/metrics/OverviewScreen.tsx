import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { efficiencyPercent } from '@/domain/efficiency';
import { monthKey } from '@/domain/localDate';
import type { LocalDate, MonthKey } from '@/domain/types';
import { AppText } from '@/ui/components/AppText';
import { Blankslate } from '@/ui/components/Blankslate';
import { Card } from '@/ui/components/Card';
import { ContributionGraph } from '@/ui/components/ContributionGraph';
import { Counter } from '@/ui/components/Counter';
import { LevelLegend } from '@/ui/components/LevelLegend';
import { MonthSwitcher } from '@/ui/components/MonthSwitcher';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { fonts, radius, space } from '@/ui/theme/tokens';

import { formatShortDate } from '../shared/model';
import { useSettings, useToday } from '../shared/queries';
import {
  efficiencyLevel,
  minSelectableMonth,
  overviewData,
  overviewDayText,
  rankingFor,
} from './model';
import { useOverview } from './queries';

/** Aba Geral: contribution graph de tudo (hábitos + tarefas) e ranking do mês. */
export function OverviewScreen() {
  const { colors } = useTheme();
  const today = useToday();
  const { data: settings } = useSettings();
  const weekStart = settings?.weekStart ?? 0;
  const data = useOverview(today, weekStart);
  const current = monthKey(today);
  const [month, setMonth] = useState<MonthKey>(current);
  const [selected, setSelected] = useState<LocalDate | null>(null);

  const overview = useMemo(
    () => (data.data ? overviewData(data.data.histories, data.data.tasks, today, weekStart) : null),
    [data.data, today, weekStart],
  );
  const ranking = useMemo(
    () => (data.data ? rankingFor(data.data.histories, month, today) : []),
    [data.data, month, today],
  );

  if (data.isError) {
    return (
      <Screen>
        <Blankslate icon="alert" title="Erro ao carregar" description={data.error.message} />
      </Screen>
    );
  }
  if (!data.data || !overview) return <Screen>{null}</Screen>;

  if (data.data.histories.length === 0 && overview.total === 0) {
    return (
      <Screen>
        <Blankslate
          icon="graph"
          title="Sem dados ainda"
          description="O gráfico geral soma os hábitos com meta cumprida e as tarefas concluídas em cada dia."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={{ gap: space.md, paddingHorizontal: space.md }}>
        <AppText variant="heading">
          <AppText variant="mono" style={{ fontWeight: '600', fontSize: 16 }}>
            {overview.total}
          </AppText>{' '}
          {overview.total === 1 ? 'item concluído' : 'itens concluídos'} no último ano
        </AppText>
        <ContributionGraph
          weeks={overview.weeks}
          monthLabels={overview.monthLabels}
          weekStart={weekStart}
          selected={selected}
          onPressDay={(d) => setSelected((cur) => (cur === d ? null : d))}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {selected
              ? `${formatShortDate(selected)} · ${overviewDayText(overview.breakdown.get(selected))}`
              : 'Toque num dia para ver o detalhe'}
          </AppText>
          <LevelLegend cell={10} />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <AppText variant="heading">Ranking de eficiência</AppText>
        <MonthSwitcher
          month={month}
          onChange={setMonth}
          max={current}
          min={minSelectableMonth(today)}
        />
        {ranking.length === 0 ? (
          <AppText variant="muted">Nenhum hábito ativo.</AppText>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.sm,
              overflow: 'hidden',
            }}
          >
            {ranking.map((r, i) => {
              const pct = efficiencyPercent(r.month.efficiency);
              const level = efficiencyLevel(r.month.efficiency);
              return (
                <Pressable
                  key={r.habitId}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}º ${r.name}, ${pct === null ? 'sem dias ativos' : `${pct}%`}`}
                  onPress={() =>
                    router.push({ pathname: '/habit/[id]', params: { id: r.habitId } })
                  }
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.md,
                    backgroundColor: pressed ? colors.canvas : 'transparent',
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  })}
                >
                  <AppText style={{ fontFamily: fonts.mono, width: 24, color: colors.textMuted }}>
                    {i + 1}
                  </AppText>
                  <View style={{ flex: 1, gap: space.xs }}>
                    <AppText numberOfLines={1} style={{ fontWeight: '600', color: colors.accent }}>
                      {r.name}
                    </AppText>
                    <ProgressBar
                      ratio={r.month.efficiency ?? 0}
                      color={level === 0 ? colors.border : colors.levels[level]}
                    />
                  </View>
                  {pct === null ? (
                    <AppText variant="mono" style={{ color: colors.textMuted }}>
                      —
                    </AppText>
                  ) : (
                    <Counter count={pct} suffix="%" />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}
