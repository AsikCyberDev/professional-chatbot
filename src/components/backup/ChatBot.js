import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import { unsafeHTML } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';
import { LitElement, html, unsafeCSS } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@4.0.0/lib/marked.esm.js';
import { defaultModels } from './defaultModels.js';
import styles from './styles.css';
import { stylesJS } from './styles.js';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);

function loadHighlightJsCss() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css';
  document.head.appendChild(link);
}

loadHighlightJsCss();

export class ChatBot extends LitElement {
  static properties = {
    endpoint: { type: String },
    heading: { type: String },
    models: { type: Array },
    theme: { type: String },
    initialModel: { type: String },
    initialTemperature: { type: Number },
    initialMaxTokens: { type: Number },
    initialTopP: { type: Number },
    input: { type: String },
    messages: { type: Array },
    isLoading: { type: Boolean },
    isChatOpen: { type: Boolean },
    isSettingsOpen: { type: Boolean },
    selectedModel: { type: String },
    temperature: { type: Number },
    maxTokens: { type: Number },
    topP: { type: Number },
    enableSettings: { type: Boolean },
    buttonLabels: { type: Object },
    fontSize: { type: String },
    initialPlaceholder: { type: String },
    subsequentPlaceholder: { type: String },
    themeSliderValue: { type: Number },
    chatContainerWidth: { type: Number },
    chatContainerHeight: { type: Number },
    language: { type: String },
    analyticsEnabled: { type: Boolean },
    authToken: { type: String },
    maxRetryAttempts: { type: Number },
    retryDelay: { type: Number },
    errorNotification: { type: Function },
  };

  static styles = [stylesJS,unsafeCSS(styles)];

  constructor() {
    super();
    this.endpoint = '';
    this.heading = 'AI Assistant';
    this.models = defaultModels;
    this.theme = 'dark';
    this.initialModel = 'Meta-Llama-3-70B-Instruct';
    this.initialTemperature = 0.7;
    this.initialMaxTokens = 2048;
    this.initialTopP = 0.9;
    this.input = '';
    this.messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    this.isLoading = false;
    this.isChatOpen = false;
    this.isSettingsOpen = false;
    this.selectedModel = this.initialModel;
    this.temperature = this.initialTemperature;
    this.maxTokens = this.initialMaxTokens;
    this.topP = this.initialTopP;
    this.enableSettings = true;
    this.buttonLabels = { send: 'Send', close: 'Close', settings: 'Settings' };
    this.fontSize = 'text-base';
    this.initialPlaceholder = 'Type your message...';
    this.subsequentPlaceholder = 'Continue the conversation...';
    this.themeSliderValue = 0;
    this.chatContainerWidth = 384;
    this.chatContainerHeight = 600;
    this.language = 'en';
    this.analyticsEnabled = false;
    this.authToken = '';
    this.maxRetryAttempts = 3;
    this.retryDelay = 2000;
    this.errorNotification = (message) => console.error(message);
  }

  firstUpdated() {
    this.loadThemeFromLocalStorage();
    this.updateThemeColors();
    this.syncSettingsUI();
    this.scrollToBottom();
    this.setupLanguage();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    this.setupResizeObserver();
    this.setupDraggable();
  }

  setupResizeObserver() {
    const chatContainer = this.shadowRoot.querySelector('.chat-container');
    if (chatContainer && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          this.chatContainerWidth = entry.contentRect.width;
          this.chatContainerHeight = entry.contentRect.height;
          this.requestUpdate();
        }
      });
      this.resizeObserver.observe(chatContainer);
    }
  }

  setupDraggable() {
    const container = this.shadowRoot.querySelector('.chat-container');
    const header = this.shadowRoot.querySelector('.chat-header');
    if (!container || !header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const startDragging = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = container.offsetLeft;
      startTop = container.offsetTop;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDragging);
    };

    const drag = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        container.style.left = `${startLeft + deltaX}px`;
        container.style.top = `${startTop + deltaY}px`;
      }
    };

    const stopDragging = () => {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDragging);
    };

    header.addEventListener('mousedown', startDragging);
  }

  syncSettingsUI() {
    const modelSelect = this.shadowRoot.querySelector('#model-select');
    if (modelSelect) {
      modelSelect.value = this.selectedModel; // Keep the selected model in sync
    }

    const tempInput = this.shadowRoot.querySelector('#temperature');
    if (tempInput) {
      tempInput.value = this.temperature;
    }

    const maxTokensInput = this.shadowRoot.querySelector('#max-tokens');
    if (maxTokensInput) {
      maxTokensInput.value = this.maxTokens;
    }

    const topPInput = this.shadowRoot.querySelector('#top-p');
    if (topPInput) {
      topPInput.value = this.topP;
    }
  }

  updateThemeColors() {
    const value = this.themeSliderValue;
    if (value <= 10) {
      // Dark Theme
      this.style.setProperty('--bg-color', '#1a202c');
      this.style.setProperty('--text-color', '#ffffff');
      this.style.setProperty('--button-color', '#4a5568');
      this.style.setProperty('--input-bg', '#2d3748');
      this.style.setProperty('--input-text', '#e2e8f0');
      this.style.setProperty('--border-color', '#2d3748');
      this.style.setProperty('--icon-color', '#e2e8f0');
      this.style.setProperty('--header-bg', '#2d3748');
      this.style.setProperty('--header-text', '#ffffff');
      this.style.setProperty('--button-text', '#ffffff');
      this.style.setProperty('--accent-color', '#3b82f6');
      this.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
    } else if (value >= 90) {
      // Light Theme
      this.style.setProperty('--bg-color', '#ffffff');
      this.style.setProperty('--text-color', '#1f2937');
      this.style.setProperty('--button-color', '#3b82f6');
      this.style.setProperty('--input-bg', '#e5e7eb');
      this.style.setProperty('--input-text', '#1f2937');
      this.style.setProperty('--border-color', '#d1d5db');
      this.style.setProperty('--icon-color', '#1f2937');
      this.style.setProperty('--header-bg', '#e5e7eb');
      this.style.setProperty('--header-text', '#1f2937');
      this.style.setProperty('--button-text', '#ffffff');
      this.style.setProperty('--accent-color', '#1d4ed8');
      this.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.15)');
    } else {
      // Gradient Theme Transition
      const progress = (value - 10) / 80;
      this.style.setProperty('--bg-color', `hsl(${progress * 210}, 40%, ${100 - progress * 50}%)`);
      this.style.setProperty('--text-color', `hsl(${progress * 210}, 30%, ${30 + progress * 40}%)`);
      this.style.setProperty('--button-color', `hsl(${progress * 210 + 120}, 60%, 50%)`);
      this.style.setProperty('--input-bg', `hsl(${progress * 210}, 50%, 90%)`);
      this.style.setProperty('--input-text', `hsl(${progress * 210}, 30%, 20%)`);
      this.style.setProperty('--border-color', `hsl(${progress * 210}, 40%, 70%)`);
      this.style.setProperty('--icon-color', `hsl(${progress * 210 + 180}, 60%, 40%)`);
      this.style.setProperty('--header-bg', `hsl(${progress * 210}, 40%, 80%)`);
      this.style.setProperty('--header-text', `hsl(${progress * 210}, 20%, 10%)`);
      this.style.setProperty('--button-text', `hsl(${progress * 210 + 180}, 80%, 90%)`);
      this.style.setProperty('--accent-color', `hsl(${progress * 210 + 90}, 60%, 50%)`);
      this.style.setProperty('--shadow-color', `rgba(0, 0, 0, ${0.3 - progress * 0.15})`);
    }
  }

  loadThemeFromLocalStorage() {
    const savedThemeValue = localStorage.getItem('chatbotThemeSliderValue');
    if (savedThemeValue) {
      this.themeSliderValue = parseInt(savedThemeValue, 10);
      this.updateThemeColors();
    }
  }

  saveThemeToLocalStorage() {
    localStorage.setItem('chatbotThemeSliderValue', this.themeSliderValue.toString());
  }

  handleThemeSliderChange(event) {
    this.themeSliderValue = parseInt(event.target.value, 10);
    this.updateThemeColors();
    this.saveThemeToLocalStorage();
  }

  setupLanguage() {
    console.log(`Current language set to: ${this.language}`);
  }

  async handleSend() {
    if (this.input.trim() && !this.isLoading) {
      const userMessage = { role: 'user', content: this.input };
      this.messages = [...this.messages, userMessage];
      this.input = '';
      this.isLoading = true;

      await this.sendMessageWithRetry({
        messages: this.messages,
        model: this.selectedModel,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        stream: true,
      });

      this.isLoading = false;
      this.focusInput();
    }
  }

  async sendMessageWithRetry(requestBody, attempt = 0) {
    let buffer = '';
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: 'assistant', content: '' };
      this.messages = [...this.messages, assistantMessage];

      const streamContent = async () => {
        const { value, done } = await reader.read();
        if (done) {
          this.scrollToBottom(true);
          this.saveMessagesToLocalStorage();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete data in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              this.scrollToBottom(true);
              this.saveMessagesToLocalStorage();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage.content += content;
                this.messages = [...this.messages.slice(0, -1), { ...assistantMessage }];
                this.requestUpdate();
                this.scrollToBottom();
              }
            } catch (error) {
              console.error('Error parsing JSON:', error, 'Data:', data);
            }
          }
        }
        setTimeout(streamContent, 50); // Continue streaming
      };

      streamContent();
    } catch (error) {
      if (attempt < this.maxRetryAttempts) {
        console.warn(`Retrying... (${attempt + 1}/${this.maxRetryAttempts})`);
        setTimeout(() => this.sendMessageWithRetry(requestBody, attempt + 1), this.retryDelay);
      } else {
        this.errorNotification('Failed to send message after multiple attempts.');
        console.error('Error sending message:', error);
        this.messages = [
          ...this.messages,
          { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }
        ];
        this.saveMessagesToLocalStorage();
      }
    }
  }

  saveMessagesToLocalStorage() {
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
  }

  clearChat() {
    this.messages = [];
    localStorage.removeItem('chatMessages');
    this.focusInput();
  }

  copyToClipboard(content) {
    navigator.clipboard.writeText(content).then(() => {
      this.showNotification('Copied to clipboard!');
    });
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed bottom-20 right-4 ${this.theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'} px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }

  focusInput() {
    requestAnimationFrame(() => {
      const inputElement = this.shadowRoot?.querySelector('#chat-input');
      if (inputElement) {
        inputElement.focus();
      }
    });
  }

  scrollToBottom(smooth = false) {
    const chatContainer = this.shadowRoot?.querySelector('.message-container');
    if (chatContainer) {
      if (smooth) {
        chatContainer.style.scrollBehavior = 'smooth';
      }
      chatContainer.scrollTop = chatContainer.scrollHeight;
      if (smooth) {
        setTimeout(() => chatContainer.style.scrollBehavior = 'auto', 500);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    const header = this.shadowRoot.querySelector('.chat-header');
    if (header) {
      header.removeEventListener('mousedown', this.startDragging);
    }
  }

  render() {
    return html`
      ${this.isChatOpen ? this.renderChatContainer() : this.renderChatButton()}
    `;
  }

  renderChatButton() {
    return html`
      <button
        class="chat-button"
        @click=${() => this.isChatOpen = true}
        aria-label="Open Chat"
      >
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M9 17H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
      </button>
    `;
  }

  renderChatContainer() {
    return html`
      <div class="chat-container" style="width: ${this.chatContainerWidth}px; height: ${this.chatContainerHeight}px;">
        <div class="chat-header">
          <span class="text-lg font-semibold ${this.fontSize}">${this.heading}</span>
          <div class="flex space-x-2">
            ${this.enableSettings ? html`
              <button class="icon-button" @click=${() => this.isSettingsOpen = !this.isSettingsOpen} aria-label="Toggle Settings">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M19.14 12.936a7.031 7.031 0 010-1.872l2.037-1.486a.5.5 0 00.122-.617l-1.931-3.343a.5.5 0 00-.6-.22l-2.397.96a7.012 7.012 0 00-1.621-.94l-.36-2.548a.5.5 0 00-.492-.416h-3.862a.5.5 0 00-.492.416l-.36 2.548a7.012 7.012 0 00-1.621.94l-2.397-.96a.5.5 0 00-.6.22l-1.931 3.343a.5.5 0 00.122.617l2.037 1.486c-.056.299-.086.603-.086.911s.03.612.086.911l-2.037 1.486a.5.5 0 00-.122.617l1.931 3.343a.5.5 0 00.6.22l2.397-.96a7.012 7.012 0 001.621.94l.36 2.548a.5.5 0 00.492.416h3.862a.5.5 0 00.492-.416l.36-2.548a7.012 7.012 0 001.621-.94l2.397.96a.5.5 0 00.6-.22l1.931-3.343a.5.5 0 00-.122-.617l-2.037-1.486zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z"/>
                </svg>
              </button>
            ` : ''}
            <button class="icon-button" @click=${() => this.isChatOpen = false} aria-label="${this.buttonLabels.close}">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        ${this.isSettingsOpen && this.enableSettings ? this.renderSettings() : ''}
        <div class="message-container" id="message-container">
          ${this.messages.map((message, index) => this.renderMessage(message, index))}
        </div>
        <div class="chat-input-container">
          <textarea
            .value=${this.input}
            @input=${(e) => this.input = e.target.value}
            @keypress=${(e) => e.key === 'Enter' && !e.shiftKey && this.handleSend()}
            class="chat-input"
            rows="2"
            style="resize: none; overflow-y: auto;"
            placeholder=${this.messages.length === 0 ? this.initialPlaceholder : this.subsequentPlaceholder}
            ?disabled=${this.isLoading}
            id="chat-input"
            aria-label="Message input"
          ></textarea>
          <button
            @click=${this.handleSend}
            class="send-button"
            ?disabled=${this.isLoading}
            aria-label="${this.buttonLabels.send}"
          >
            ${this.isLoading
        ? html`<svg class="icon animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>`
        : html`<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M10.185 3L3 21h18L10.185 3z"/>
                    </svg>`}
          </button>
        </div>
      </div>
    `;
  }

  renderSettings() {
    return html`
    <div class="settings-container p-4 border-b" style="background: var(--bg-color); border-color: var(--border-color); border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-color);">
      <div class="setting-item mb-4">
        <label for="model-select" class="block text-sm font-medium mb-1" style="color: var(--text-color);">Model</label>
        <select
          id="model-select"
          .value=${this.selectedModel}
          @change=${(e) => this.selectedModel = e.target.value}
          class="block w-full pl-3 pr-10 py-2 text-base rounded-md border"
          style="background: var(--input-bg); color: var(--input-text); border-color: var(--border-color);"
          aria-label="Model Selection"
        >
          ${this.models.map((model) => html`
            <option value=${model} ?selected=${model === this.selectedModel}>${model}</option>
          `)}
        </select>
      </div>
      <div class="setting-item mb-4">
        <label for="temperature" class="block text-sm font-medium mb-1" style="color: var(--text-color);">Temperature: ${this.temperature.toFixed(2)}</label>
        <input
          type="range"
          id="temperature"
          .value=${this.temperature}
          @input=${(e) => this.temperature = parseFloat(e.target.value)}
          min="0"
          max="2"
          step="0.1"
          class="w-full"
          aria-label="Temperature adjustment"
        />
      </div>
      <div class="setting-item mb-4">
        <label for="max-tokens" class="block text-sm font-medium mb-1" style="color: var(--text-color);">Max Tokens: ${this.maxTokens}</label>
        <input
          type="range"
          id="max-tokens"
          .value=${this.maxTokens}
          @input=${(e) => this.maxTokens = parseInt(e.target.value)}
          min="1"
          max="8192"
          class="w-full"
          aria-label="Max tokens adjustment"
        />
      </div>
      <div class="setting-item mb-4">
        <label for="top-p" class="block text-sm font-medium mb-1" style="color: var(--text-color);">Top P: ${this.topP.toFixed(2)}</label>
        <input
          type="range"
          id="top-p"
          .value=${this.topP}
          @input=${(e) => this.topP = parseFloat(e.target.value)}
          min="0"
          max="1"
          step="0.1"
          class="w-full"
          aria-label="Top P adjustment"
        />
      </div>
      <div class="setting-item mb-4">
        <h3 class="text-sm font-medium mb-1" style="color: var(--text-color);">Adjust Theme</h3>
        <input
          type="range"
          id="theme-slider"
          min="0"
          max="100"
          .value=${this.themeSliderValue}
          @input=${this.handleThemeSliderChange}
          class="w-full"
          aria-label="Theme adjustment slider"
        />
      </div>
      <div class="p-2 flex justify-end space-x-2" style="background: var(--bg-color); border-top: 1px solid var(--border-color);">
        <button @click=${this.clearChat} class="icon-button" aria-label="Clear chat" style="background: var(--button-bg); color: var(--button-text); border-radius: 4px; padding: 8px;">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1 1 11h8l1-11 3-1v-1H3v1zm4 2h10v9H7V8zm4 0V5h2v3h-2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }

  renderMessage(message) {
    const containerClass = message.role === 'user' ? 'justify-end' : 'justify-start';
    const messageClass = message.role === 'user'
      ? `message user ${this.theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} text-white`
      : `message assistant ${this.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${this.theme === 'dark' ? 'text-white' : 'text-gray-800'}`;

    // Convert Markdown to HTML
    const htmlContent = marked(message.content, {
      highlight: function (code, lang) {
        return lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang }).value
          : hljs.highlightAuto(code).value;
      },
    });

    return html`
      <div class="flex ${containerClass} items-end space-x-2 w-full">
        <div class="flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} space-y-1 max-w-[80%]">
          <div class="${messageClass} px-3 py-2 rounded-lg shadow-sm">
            <div class="prose ${this.theme === 'dark' ? 'prose-invert' : ''} max-w-none">
              ${unsafeHTML(htmlContent)}
            </div>
          </div>
          <button
            @click=${() => this.copyToClipboard(message.content)}
            class="icon-button"
            aria-label="Copy message"
          >
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M6 9h12v2H6V9zm0 4h12v2H6v-2zm0 4h12v2H6v-2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('chat-bot', ChatBot);
