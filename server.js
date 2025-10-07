const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Configurar CORS para permitir peticiones desde tu sitio
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://playroompv.com',
    'https://www.playroompv.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware para parsear JSON
app.use(express.json());

// Health check para Railway
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Eventbrite Proxy funcionando 🚀',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/events', async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Faltan parámetros month y year' });
    }

    // Validar y parsear parámetros
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'El mes debe ser un número entre 1 y 12' });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'El año debe ser un número válido' });
    }

    // Formatear fechas con padding de ceros
    const monthPadded = monthNum.toString().padStart(2, '0');
    const startDate = `${yearNum}-${monthPadded}-01T00:00:00Z`;
    
    // Calcular último día del mes correctamente
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const lastDayPadded = lastDay.toString().padStart(2, '0');
    const endDate = `${yearNum}-${monthPadded}-${lastDayPadded}T23:59:59Z`;

    console.log(`Consultando eventos: ${startDate} a ${endDate}`);
    
    // Verificar que el token existe
    if (!process.env.EVENTBRITE_TOKEN) {
      throw new Error('EVENTBRITE_TOKEN no está configurado');
    }

    const ORGANIZATION_ID = '2877190433721';

    const response = await axios.get(`https://www.eventbriteapi.com/v3/organizations/${ORGANIZATION_ID}/events/`, {
      headers: {
        Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}`
      },
      params: {
        'time_filter': 'current_future',
        'order_by': 'start_asc',
        'expand': 'venue'
      }
    });

    // Filtrar eventos por mes y año localmente
    const allEvents = response.data.events || [];
    const filteredEvents = allEvents.filter(event => {
      if (!event.start || !event.start.utc) return false;
      const eventDate = new Date(event.start.utc);
      return eventDate.getFullYear() === yearNum && 
             eventDate.getMonth() === monthNum - 1;
    });

    console.log(`Eventos encontrados: ${filteredEvents.length} de ${allEvents.length} totales`);
    res.json(filteredEvents);
  } catch (error) {
    console.error('Error al obtener eventos:', error.message);
    
    // Manejo seguro de errores
    if (error.response) {
      // Error de respuesta de la API de Eventbrite
      return res.status(error.response.status || 500).json({
        error: 'Error al consultar la API de Eventbrite',
        message: error.response.data?.error_description || error.response.data?.error || 'Error desconocido'
      });
    }
    
    // Error de red o timeout
    res.status(500).json({
      error: 'No se pudieron obtener los eventos',
      message: 'Error de conexión con Eventbrite'
    });
  }
});

// Escuchar en 0.0.0.0 para Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Variables de entorno: TOKEN=${process.env.EVENTBRITE_TOKEN ? '✓' : '✗'}`);
});

// Manejar señales de cierre correctamente
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor gracefully...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});