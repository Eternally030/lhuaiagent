
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import characterImage from './assets/aigril.png';

// 天氣代碼轉圖示的輔助函式
const getWeatherIcon = (weatherCode) => {
  if (weatherCode === 0) return '☀️';
  if (weatherCode >= 1 && weatherCode <= 3) return '⛅️';
  if (weatherCode >= 45 && weatherCode <= 48) return '🌫️';
  if (weatherCode >= 51 && weatherCode <= 67) return '🌧️';
  if (weatherCode >= 71 && weatherCode <= 77) return '❄️';
  if (weatherCode >= 80 && weatherCode <= 99) return '⛈️';
  return '🌡️';
};

function App() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: '你好！我是您的 AI 夥伴。' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const recognitionRef = useRef(null);
  const chatWindowRef = useRef(null);

  // 天氣相關 state
  const [weather, setWeather] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  // 抓取天氣資料的 Effect
  useEffect(() => {
    const fetchWeather = async () => {
      const latitude = 25.07;
      const longitude = 121.47;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        });
      } catch (error) {
        console.error("無法取得天氣資訊:", error);
      } finally {
        setIsLoadingWeather(false);
      }
    };
    fetchWeather();
  }, []);

  // 時間相關 Effect
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 語音辨識 Effect
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-TW';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      handleSendMessage(transcript);
    };
    recognition.onerror = (event) => console.error('語音辨識錯誤:', event.error);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []); // 這裡的依賴陣列是空的

  // 自動捲動 Effect
  useEffect(() => {
    if (chatWindowRef.current) {
      const chatWindow = chatWindowRef.current;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }, [messages]);

  // 模擬 AI 回應
  const getAIResponse = async (userMessage) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const lowerCaseMessage = userMessage.toLowerCase();
    if (lowerCaseMessage.includes('你好')) return '你好啊！今天過得如何？';
    if (lowerCaseMessage.includes('名字')) return '我是一個 AI 夥伴，為您服務！';
    return '抱歉，我不太了解您的意思。';
  };

  // 語音合成
  const speakResponse = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 1.2;
    utterance.onstart = () => setIsTalking(true);
    utterance.onend = () => setIsTalking(false);
    window.speechSynthesis.speak(utterance);
  };

  // 發送訊息 (使用 useCallback)
  const handleSendMessage = useCallback(async (textToSend) => {
    const messageText = typeof textToSend === 'string' ? textToSend : userInput;
    if (!messageText.trim()) return;
    setUserInput('');
    setMessages(prev => [...prev, { sender: 'user', text: messageText }]);
    setIsLoading(true);
    const aiResponseText = await getAIResponse(messageText);
    setIsLoading(false);
    setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    speakResponse(aiResponseText);
  }, [userInput]);

  // 按住/放開錄音
  const startRecording = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };
  const stopRecording = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  // 處理 Enter 鍵
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && userInput) {
      handleSendMessage();
    }
  };

  // 刷新頁面
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div
      className="app-container"
      style={{ '--character-image': `url(${characterImage})` }}
    >
      <header className="app-header">
        <h1>LHU Speaker</h1>
        <div className="header-right-panel">
          <div className="weather-module">
            {isLoadingWeather ? '...' : weather ? (
              <><span className="weather-icon">{getWeatherIcon(weather.weatherCode)}</span><span>{weather.temperature}°C</span></>
            ) : '--'}
          </div>
          <div className="time-module">
            {currentTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
      </header>

      <div className="side-buttons">
        <button className="side-btn active">中</button>
        <button className="side-btn">Eng</button>
        <button className="side-btn refresh" onClick={handleRefresh}>↻</button>
      </div>

      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="loading-indicator"></div>
          </div>
        )}
      </div>

      <div className="floating-voice-button-container">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`voice-button ${isListening ? 'listening' : ''} ${isTalking ? 'talking' : ''}`}
          aria-label="按住說話"
        >
          🎤
        </button>
      </div>

      <div className="bottom-input-bar">
        <input
          type="text"
          className="text-input"
          placeholder="在這裡輸入訊息..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !userInput}
        >
          發送
        </button>
      </div>
    </div>
  );
}

export default App;