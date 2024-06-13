const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = 3000;

// Ключевые слова и соответствующие URL
const keywordUrls = {
  example: ['https://example.com', 'https://another-example.com'],
  студент: ['https://student.com', 'https://another-student.com'],
  привет: ['https://example.com', 'https://another-example.com'],
  пока: ['https://example'],
  hello: ['example.com', 'example.ru'],
};  

// Middleware для парсинга JSON
app.use(express.json());
app.use(cors());

// Возвращает список URL по ключевому слову
app.get('/urls', (req, res) => {
  const keyword = req.query.keyword;
  console.log(`Received request for keyword: ${keyword}`);
  const urls = keywordUrls[keyword];
  if (urls) {
    res.json(urls);
  } else {
    res.status(404).json({ error: 'Keyword not found' });
  }
});

// WebSocket сервер для отслеживания прогресса загрузки
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const { url, keyword } = JSON.parse(message);
    axios
      .get(url, { responseType: 'stream' })
      .then((response) => {
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;

        response.data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          ws.send(
            JSON.stringify({
              keyword,
              url,
              status: 'downloading',
              progress: ((downloadedLength / totalLength) * 100).toFixed(2),
              downloaded: downloadedLength,
              total: totalLength,
            })
          );
        });

        response.data.on('end', () => {
          ws.send(
            JSON.stringify({
              keyword,
              url,
              status: 'completed',
              progress: 100,
              downloaded: totalLength,
              total: totalLength,
            })
          );
          ws.close();
        });
      })
      .catch((error) => {
        ws.send(JSON.stringify({ error: error.message }));
        ws.close();
      });
  });
});

// Настройка сервера для работы с WebSocket
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});
