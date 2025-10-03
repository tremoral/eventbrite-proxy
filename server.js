const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Eventbrite Proxy funcionando 🚀');
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

    const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
      headers: {
        Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}`
      },
      params: {
        'start_date.range_start': startDate,
        'start_date.range_end': endDate,
        'status': 'live'
      }
    });

    res.json(response.data.events || []);
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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});