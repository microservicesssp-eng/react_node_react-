import { useCallback, useEffect, useState } from "react";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "medium"
});

async function getMessages() {
  const response = await fetch("/api/messages?limit=200");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не удалось загрузить сообщения.");
  return data;
}

function App() {
  const [sender, setSender] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const refreshMessages = useCallback(async () => {
    try {
      setMessages(await getMessages());
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    refreshMessages();
    const timer = window.setInterval(refreshMessages, 2000);
    return () => window.clearInterval(timer);
  }, [refreshMessages]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось отправить сообщение.");
      setMessages((current) => [...current, data].slice(-200));
      setText("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Сообщения, на главную">
          <span className="brand-mark">✳</span>
          <span>Сообщения<span className="brand-dot">.</span></span>
        </a>
        <div className="stack-badge"><span className="status-dot" /> React <b>+</b> Node <b>+</b> SQLite</div>
      </header>

      <section className="intro">
        <div className="eyebrow"><span /> ДЕМО-ПРИЛОЖЕНИЕ</div>
        <h1>Сообщение отправлено.<br /><span>Оно уже в базе.</span></h1>
        <p>Введите текст слева — и он появится справа вместе с именем отправителя и временем получения.</p>
      </section>

      {error && <div className="alert" role="alert">{error}</div>}

      <section className="workspace" aria-label="Обмен сообщениями">
        <article className="panel compose-panel">
          <div className="panel-heading">
            <div className="step-number">01</div>
            <div><h2>Новое сообщение</h2><p>Отправка в общую ленту</p></div>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="sender">Ваше имя</label>
            <input
              id="sender"
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              placeholder="Например, Анна"
              maxLength={60}
              required
            />
            <label htmlFor="message">Текст сообщения</label>
            <textarea
              id="message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Напишите что-нибудь..."
              maxLength={2000}
              rows={6}
              required
            />
            <div className="form-footer">
              <span>{text.length} / 2000</span>
              <button type="submit" disabled={sending || !sender.trim() || !text.trim()}>
                {sending ? "Отправляем..." : <>Отправить <span aria-hidden="true">↗</span></>}
              </button>
            </div>
          </form>
          <div className="privacy-note"><span>⌑</span> Сообщение сохраняется в SQLite на сервере</div>
        </article>

        <article className="panel feed-panel">
          <div className="panel-heading feed-heading">
            <div className="step-number step-number-purple">02</div>
            <div><h2>Полученные</h2><p>Обновление автоматически</p></div>
            <span className="live-indicator"><span /> LIVE</span>
          </div>
          <div className="message-list" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">↙</div>
                <strong>Здесь пока тихо</strong>
                <span>Отправьте первое сообщение<br />из панели слева</span>
              </div>
            ) : messages.map((message) => (
              <article className="message-card" key={message.id}>
                <div className="message-meta">
                  <div className="avatar">{message.sender.trim().charAt(0).toLocaleUpperCase("ru-RU")}</div>
                  <strong>{message.sender}</strong>
                  <time dateTime={message.receivedAt}>{dateFormatter.format(new Date(message.receivedAt))}</time>
                </div>
                <p>{message.text}</p>
              </article>
            ))}
          </div>
          <div className="feed-footer"><span className="feed-dot" /> {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"} в ленте</div>
        </article>
      </section>
      <footer className="page-footer">
        <span>Данные сохраняются между перезапусками</span>
        <span>Сделано для локального запуска <b>♥</b></span>
      </footer>
    </main>
  );
}

export default App;
