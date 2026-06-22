import React, { useState } from 'react'
import { motion } from 'motion/react'
import { playClick } from '../utils/audio'

interface AskIrisProps {
  onAskIris?: (text: string) => void
  isSystemActive: boolean
}

export const AskIrisView: React.FC<AskIrisProps> = ({ onAskIris, isSystemActive }) => {
  const [questionText, setQuestionText] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!questionText.trim()) return
    setIsSending(true)
    playClick()

    if (onAskIris) {
      await onAskIris(questionText)
    } else {
      // Dynamic import to use the voice service
      const { irisService } = await import('../services/Iris-voice-ai')
      irisService.sendText(questionText)
    }

    setQuestionText('')
    setIsSending(false)
  }

  return (
    <div className="w-full h-full min-h-[70vh] flex items-center justify-center p-4 bg-black select-none pointer-events-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="ask-iris-card"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          ASK IRIS
        </h1>

        <p className="text-zinc-300 mt-4 leading-7">
          Type your question below. IRIS will respond using voice
          if the system is active.
        </p>

        <div className="relative mt-6">
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend()
              }
            }}
            placeholder="Ask anything..."
            className="w-full bg-black text-white px-4 focus:outline-none focus:ring-2 focus:ring-[#00ffb3]/50 transition-all"
            disabled={isSending}
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={isSending || !questionText.trim()}
          className="w-full mt-4 bg-[#00ffb3] text-black font-bold h-12 rounded-xl transition-all hover:bg-[#00d696] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? 'SENDING...' : 'Send'}
        </button>

        {/* System Active Status Overlay Badge inside Card */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSystemActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
            {isSystemActive ? "IRIS VOICE IS ONLINE" : "IRIS VOICE STANDBY"}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

export default AskIrisView
