// src/components/admin/ActivityChart.tsx
import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  ToggleButtonGroup, 
  ToggleButton,
  useTheme
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../services/supabase';

interface ChartData {
  name: string;
  date: Date;
  appointments?: number;
  users?: number;
}

type TimeRange = '7days' | '30days' | '90days' | '12months';
type ChartType = 'appointments' | 'users' | 'both';

interface ActivityChartProps {
  title: string;
  defaultTimeRange?: TimeRange;
  defaultChartType?: ChartType;
}

const ActivityChart: React.FC<ActivityChartProps> = ({ 
  title, 
  defaultTimeRange = '30days', 
  defaultChartType = 'both' 
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Déterminer la plage de dates en fonction de la sélection
        const today = new Date();
        let startDate: Date;
        let dateFormat: string;
        let dateInterval: Date[];

        switch (timeRange) {
          case '7days':
            startDate = subDays(today, 6);
            dateFormat = 'EEE';
            dateInterval = eachDayOfInterval({ start: startDate, end: today });
            break;
          case '30days':
            startDate = subDays(today, 29);
            dateFormat = 'dd MMM';
            dateInterval = eachDayOfInterval({ start: startDate, end: today });
            break;
          case '90days':
            startDate = subDays(today, 89);
            dateFormat = 'dd MMM';
            dateInterval = eachWeekOfInterval({ start: startDate, end: today });
            break;
          case '12months':
            startDate = subMonths(today, 11);
            dateFormat = 'MMM yy';
            dateInterval = eachMonthOfInterval({ start: startDate, end: today });
            break;
          default:
            startDate = subDays(today, 29);
            dateFormat = 'dd MMM';
            dateInterval = eachDayOfInterval({ start: startDate, end: today });
        }

        // Initialiser les données du graphique
        const initialData: ChartData[] = dateInterval.map(date => ({
          name: format(date, dateFormat, { locale: fr }),
          date: date,
          appointments: 0,
          users: 0
        }));

        // Récupérer les données réelles depuis Supabase
        const fetchPromises = [];

        if (chartType === 'appointments' || chartType === 'both') {
          const appointmentsPromise = supabase
            .from('appointments')
            .select('start_time, created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', today.toISOString());
          fetchPromises.push(appointmentsPromise);
        } else {
          fetchPromises.push(Promise.resolve({ data: [] }));
        }

        if (chartType === 'users' || chartType === 'both') {
          const usersPromise = supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', today.toISOString());
          fetchPromises.push(usersPromise);
        } else {
          fetchPromises.push(Promise.resolve({ data: [] }));
        }

        const [appointmentsResponse, usersResponse] = await Promise.all(fetchPromises);

        // Vérifier les erreurs
        if ('error' in appointmentsResponse && appointmentsResponse.error) throw appointmentsResponse.error;
        if ('error' in usersResponse && usersResponse.error) throw usersResponse.error;

        const appointmentsData = appointmentsResponse.data || [];
        const usersData = usersResponse.data || [];

        // Fonction pour déterminer si une date appartient à un intervalle spécifique
        const isInInterval = (date: Date, intervalDate: Date, timeRange: TimeRange) => {
          const dateObj = new Date(date);
          
          switch (timeRange) {
            case '7days':
            case '30days':
              return format(dateObj, 'yyyy-MM-dd') === format(intervalDate, 'yyyy-MM-dd');
            case '90days':
              // Pour une semaine, vérifier si la date est dans la même semaine
              const weekStart = intervalDate;
              const weekEnd = subDays(weekStart, -6);
              return dateObj >= weekStart && dateObj <= weekEnd;
            case '12months':
              // Pour un mois, vérifier si la date est dans le même mois
              return (
                dateObj.getMonth() === intervalDate.getMonth() && 
                dateObj.getFullYear() === intervalDate.getFullYear()
              );
            default:
              return false;
          }
        };

        // Remplir les données avec les valeurs réelles
        const filledData = initialData.map(item => {
          // Compter les rendez-vous pour cette période
          const appointments = chartType !== 'users' 
            ? appointmentsData.filter(apt => isInInterval(new Date(apt.created_at), item.date, timeRange)).length 
            : undefined;
          
          // Compter les utilisateurs pour cette période
          const users = chartType !== 'appointments' 
            ? usersData.filter(user => isInInterval(new Date(user.created_at), item.date, timeRange)).length 
            : undefined;
          
          return {
            ...item,
            appointments,
            users
          };
        });

        setChartData(filledData);
      } catch (error: any) {
        console.error('Erreur lors de la récupération des données du graphique:', error);
        setError(`Impossible de charger les données: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [timeRange, chartType]);

  const handleTimeRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: TimeRange | null,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newChartType: ChartType | null,
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ToggleButtonGroup
            size="small"
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            aria-label="type de graphique"
          >
            <ToggleButton value="appointments" aria-label="rendez-vous">
              Rendez-vous
            </ToggleButton>
            <ToggleButton value="users" aria-label="utilisateurs">
              Utilisateurs
            </ToggleButton>
            <ToggleButton value="both" aria-label="les deux">
              Les deux
            </ToggleButton>
          </ToggleButtonGroup>
          
          <ToggleButtonGroup
            size="small"
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            aria-label="plage de temps"
          >
            <ToggleButton value="7days" aria-label="7 jours">
              7j
            </ToggleButton>
            <ToggleButton value="30days" aria-label="30 jours">
              30j
            </ToggleButton>
            <ToggleButton value="90days" aria-label="90 jours">
              90j
            </ToggleButton>
            <ToggleButton value="12months" aria-label="12 mois">
              12m
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey="name" 
                tickMargin={10}
                stroke={theme.palette.text.secondary}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tickMargin={10}
              />
              <Tooltip />
              <Legend />
              {(chartType === 'appointments' || chartType === 'both') && (
                <Line
                  type="monotone"
                  dataKey="appointments"
                  name="Rendez-vous"
                  stroke={theme.palette.primary.main}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              )}
              {(chartType === 'users' || chartType === 'both') && (
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Utilisateurs"
                  stroke={theme.palette.secondary.main}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default ActivityChart;