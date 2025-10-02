// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

// Ruta para obtener eventos del mes
app.get('/api/events', async (req, res) => {
  try {
    const { month, year } = req.query;

    // Construye las fechas de inicio y fin del mes
    const startDate = `${year}-${month}-01T00:00:00Z`;
    const endDate = `${year}-${month}-31T23:59:59Z`;

    const response = await axios.get('https://www.eventbriteapi.com/v3/users/me/events/', {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`
      },
      params: {
        'start_date.range_start': startDate,
        'start_date.range_end': endDate,
        'status': 'live'
      }
    });

    res.json(response.data.events);
  } catch (error) {
    console.error('Error al obtener eventos:', error.response?.data || error.message);
    res.status(500).json({ error: 'No se pudieron obtener los eventos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});