const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

require('./init-db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/live', require('./routes/live'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('🚀 Server running on port 3000'));
