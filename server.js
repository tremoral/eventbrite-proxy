const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

// Ruta raíz para verificar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('Eventbrite Proxy funcionando 🚀');
});

// Ruta para obtener eventos por mes y año
app.get('/api/events', async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Faltan parámetros month y year' });
    }

    // Formato de fechas para Eventbrite
    const startDate = `${year}-${month}-01T00:00:00Z`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month}-${lastDay}T23:59:59Z`;

    // Consulta al endpoint correcto
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

    // Devuelve los eventos encontrados
    res.json(response.data.events || []);
  } catch (error) {
    // Manejo de errores para evitar caída del contenedor
    console.error('Error al obtener eventos:', error.response?.data || error.message);
    res.status(500).json({
      error: 'No se pudieron obtener los eventos',
      details: error.response?.data || error.message
    });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});