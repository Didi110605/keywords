document.getElementById('fetchUrlsButton').addEventListener('click', () => {
  const keyword = document.getElementById('keywordInput').value;
  fetch(`http://localhost:3000/urls?keyword=${encodeURIComponent(keyword)}`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        } else {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }
      }
      return response.json();
    })
    .then((urls) => {
      const urlListDiv = document.getElementById('urlList');
      urlListDiv.innerHTML = '';

      if (urls === null) {
        const noUrlsElement = document.createElement('div');
        noUrlsElement.textContent = 'Урлов по этому ключевому слову не найдено';
        urlListDiv.appendChild(noUrlsElement);
      } else {
        urls.forEach((url) => {
          const urlElement = document.createElement('div');
          urlElement.textContent = url;
          urlElement.addEventListener('click', () =>
            downloadContent(keyword, url)
          );
          urlListDiv.appendChild(urlElement);
        });
      }
    })
    .catch((error) => {
      alert(`Ошибка: ${error.message}`);
    });
});

function downloadContent(keyword, url) {
  const ws = new WebSocket(`ws://localhost:3000`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ keyword, url }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'downloading') {
      document.getElementById(
        'progress'
      ).textContent = `Идет загрузка: ${data.progress}% (${data.downloaded}/${data.total} bytes)`;
    } else if (data.status === 'completed') {
      document.getElementById('progress').textContent = 'Загрузка закончена';
      saveContent(keyword, url, data.downloaded);
    } else if (data.error) {
      alert(`Error: ${data.error}`);
    }
  };
}

function saveContent(keyword, url, content) {
  const storedData = JSON.parse(
    localStorage.getItem('downloadedContent') || '{}'
  );
  if (!storedData[keyword]) {
    storedData[keyword] = [];
  }
  storedData[keyword].push({ url, content });
  localStorage.setItem('downloadedContent', JSON.stringify(storedData));
  displayDownloadedContent();
}

function displayDownloadedContent() {
  const storedData = JSON.parse(
    localStorage.getItem('downloadedContent') || '{}'
  );
  const contentListDiv = document.getElementById('contentList');
  contentListDiv.innerHTML = '';

  Object.keys(storedData).forEach((keyword) => {
    const keywordDiv = document.createElement('div');
    keywordDiv.textContent = `Ключевое слово: ${keyword}`;
    contentListDiv.appendChild(keywordDiv);

    storedData[keyword].forEach((item) => {
      const contentDiv = document.createElement('div');
      contentDiv.textContent = `URL: ${item.url} - Content: ${item.content}`;
      contentListDiv.appendChild(contentDiv);
    });
  });
}

displayDownloadedContent();
