import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Send, Bot, Sparkles, User, RefreshCw, ArrowRight, HelpCircle } from 'lucide-react'
import { chatWithAiBot } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const SUGGESTIONS = [
  { text: 'Find a rental flat in Dhanmondi under 25,000 BDT', label: 'Rent Flat' },
  { text: 'Recommend a premium wooden sofa for a small living room', label: 'Sofa Suggestion' },
  { text: 'Show home appliances like refrigerators or televisions', label: 'Appliances' },
  { text: 'Flats for sale in Gulshan or Uttara', label: 'Buy Flat' },
]

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your **Thikana AI Assistant**. 🏠\n\nI can help you search for rental/sale apartments, recommend furniture configurations, suggest home appliances, or discuss budget setups. What are you looking for today?",
      time: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  const chatEndRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (textToSend) => {
    const messageContent = textToSend || input
    if (!messageContent.trim() || loading) return

    if (!textToSend) setInput('')

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageContent,
      time: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Map history to server format: [{ sender: 'user'|'bot', text: '...' }]
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text,
      }))

      const res = await chatWithAiBot(messageContent, historyPayload)
      
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.response || "I'm sorry, I couldn't formulate a recommendation at this moment. Please try again.",
        time: new Date(),
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: "⚠️ I'm having trouble connecting to the Thikana AI service. Please verify your internet or try again later.",
        time: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Parses markdown links like [Text](/product/123) and wraps them in Link components
  const renderMessageText = (text) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      const [fullMatch, linkText, url] = match
      const index = match.index

      // Push preceding text
      if (index > lastIndex) {
        parts.push(text.slice(lastIndex, index))
      }

      // Push custom React Router Link
      parts.push(
        <Link 
          key={index} 
          to={url} 
          className="text-theme-primary font-bold hover:underline inline-flex items-center gap-0.5 bg-theme-primary/10 px-2 py-0.5 rounded"
        >
          {linkText} <ArrowRight size={10} />
        </Link>
      )

      lastIndex = index + fullMatch.length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    // Format newlines
    return parts.length > 0 ? (
      <span className="whitespace-pre-line">
        {parts.map((p, i) => typeof p === 'string' ? p : p)}
      </span>
    ) : (
      <span className="whitespace-pre-line">{text}</span>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-theme-bg pt-20 pb-12 flex flex-col justify-between">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex-1 flex flex-col mt-4">
          
          {/* Header */}
          <div className="mb-6 flex items-center justify-between border-b border-theme-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-theme-primary/15 text-theme-primary">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black text-theme-text flex items-center gap-2">
                  Intelligent AI Assistant
                </h1>
                <p className="text-xs text-theme-muted">
                  Ask about housing rentals, sales, properties, and product suggestions.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setMessages([messages[0]])}
              className="p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-card border border-transparent hover:border-theme-border transition-all"
              title="Reset Chat"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Main Chat Area */}
          <div className="glass-panel flex-1 flex flex-col overflow-hidden min-h-[460px] max-h-[580px] rounded-[32px]">
            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
              {messages.map((msg) => {
                const isBot = msg.sender === 'bot'
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                      isBot 
                        ? 'bg-gradient-to-tr from-orange-400 to-orange-600' 
                        : 'bg-gradient-to-tr from-blue-500 to-indigo-600'
                    }`}>
                      {isBot ? <Bot size={14} /> : <User size={14} />}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                      isBot 
                        ? 'bg-theme-card border border-theme-border text-theme-text' 
                        : 'bg-theme-primary text-white font-medium shadow-md shadow-theme-primary/15'
                    }`}>
                      {renderMessageText(msg.text)}
                    </div>
                  </div>
                )
              })}

              {loading && (
                <div className="flex gap-3 mr-auto items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center text-white">
                    <Bot size={14} />
                  </div>
                  <div className="p-4 rounded-3xl bg-theme-card border border-theme-border text-theme-muted flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-4 py-3 border-t border-theme-border/50 bg-theme-bg/50 flex flex-wrap gap-2">
              {SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.text)}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-full bg-theme-card border border-theme-border text-xs text-theme-text font-medium hover:border-theme-primary hover:text-theme-primary transition-all disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend() }}
              className="p-4 bg-theme-card border-t border-theme-border flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about Dhanmondi rentals, sofas, TVs, budget setups..."
                className="flex-1 input-field py-3.5 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3.5 rounded-xl bg-theme-primary text-white font-bold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
