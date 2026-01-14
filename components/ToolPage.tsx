
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, Tool, ChatMessage } from '../types.ts';
import { ArrowLeft, Send, AILoader, Sparkles, AlertTriangle, User as UserIcon, Copy, Check, ThumbsUp, ThumbsDown, Paperclip, X, FileText, Save, Loader } from './icons.tsx';
import HexGridBackground from './HexGridBackground.tsx';
import { ALL_TOOLS } from '../constants.tsx';
import { AI_MODELS } from '../services/aiConfig';

interface ToolPageProps {
  user: UserProfile | null;
  selectedTool: Tool;
  chatHistories: { [key: string]: ChatMessage[] };
  onNavigate: (page: 'dashboard') => void;
  onUseTool: (toolId: string, userPrompt: string, modelResponse: string) => void;
  onSetSatisfaction: (toolId: string, messageIndex: number, satisfaction: 'satisfied' | 'unsatisfied') => void;
}

const FormattedResponse: React.FC<{ text: string }> = ({ text }) => {
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts = text.split(codeBlockRegex);

  return (
    <div>
      {parts.map((part, index) => {
        // This is a code block
        if (index % 2 === 1) {
          const codeContent = part.split('\n').slice(1).join('\n'); // remove language hint
          return (
            <pre key={index} className="bg-gray-100 dark:bg-black/50 p-3 font-mono text-sm my-2 block overflow-x-auto border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-300">
              <code>{codeContent || part}</code>
            </pre>
          );
        }

        // This is regular text, process it further
        const boldRegex = /\*\*(.*?)\*\*/g;
        const lines = part.split('\n').map((line, lineIndex) => {
          if (line.trim() === '') return null;

          // Headings
          if (line.startsWith('# ')) {
            const content = line.substring(2);
            return <h1 key={`${index}-${lineIndex}`} className="text-xl font-bold my-3 pt-2 font-mono text-gray-900 dark:text-white">{content}</h1>;
          }
          if (line.startsWith('## ')) {
            const content = line.substring(3);
            return <h2 key={`${index}-${lineIndex}`} className="text-lg font-semibold my-2 pt-1 font-mono text-gray-900 dark:text-white">{content}</h2>;
          }

          // Handle list items
          if (line.trim().startsWith('- ')) {
            const content = line.trim().substring(2);
            const formattedContent = content.split(boldRegex).map((subPart, i) =>
              i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{subPart}</strong> : subPart
            );
            return <li key={`${index}-${lineIndex}`}>{formattedContent}</li>;
          }

          // Handle paragraphs with bold text
          const formattedLine = line.split(boldRegex).map((subPart, i) =>
            i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{subPart}</strong> : subPart
          );
          return <p key={`${index}-${lineIndex}`} className="my-1">{formattedLine}</p>;
        }).filter(Boolean);

        // Group list items
        const groupedElements: React.ReactNode[] = [];
        let currentList: React.ReactNode[] = [];
        for (const line of lines) {
          if (React.isValidElement(line) && line.type === 'li') {
            currentList.push(line);
          } else {
            if (currentList.length > 0) {
              groupedElements.push(<ul key={`ul-${index}-${groupedElements.length}`} className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
              currentList = [];
            }
            groupedElements.push(line);
          }
        }
        if (currentList.length > 0) {
          groupedElements.push(<ul key={`ul-end-${index}`} className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
        }

        return groupedElements;
      })}
    </div>
  );
};


const ToolPage: React.FC<ToolPageProps> = ({ user, selectedTool, chatHistories, onNavigate, onUseTool, onSetSatisfaction }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState<number | null>(null);
  const [promptExamples, setPromptExamples] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [savingState, setSavingState] = useState<{ index: number; status: 'saving' | 'saved' | 'error' } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentChatHistory = chatHistories[selectedTool.id] || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChatHistory, isLoading]);
  
  useEffect(() => {
    if (selectedTool.promptExamples) {
      if (typeof selectedTool.promptExamples === 'function' && user) {
        setPromptExamples(selectedTool.promptExamples(user));
      } else if (Array.isArray(selectedTool.promptExamples)) {
        setPromptExamples(selectedTool.promptExamples);
      }
    } else {
      setPromptExamples([]);
    }
    setPrompt('');
    setFile(null);
  }, [selectedTool, user]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove prefix `data:mime/type;base64,`
            const base64String = result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
  }

  const handleDownload = (content: string, index: number) => {
    setSavingState({ index, status: 'saving' });
    try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ElevenViews-${selectedTool.name.replace(/\s/g, '_')}-${new Date().toISOString()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSavingState({ index, status: 'saved' });
        setTimeout(() => setSavingState(null), 2000);
    } catch (err) {
        console.error("Download failed", err);
        setError("Could not prepare the file for download.");
        setSavingState({ index, status: 'error' });
        setTimeout(() => setSavingState(null), 3000);
    }
  };


  const handleGenerate = async () => {
    if ((!prompt && !file) || isLoading || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const userContext = `
[START AGENCY CONTEXT - "YOUR RECIPE"]
The user's name is ${user.name} and their role is ${user.role}.
The agency's core competency is: ${user.agencyCoreCompetency}.
Their brand voice is: "${user.agencyBrandVoice}".
They primarily work with clients in the ${user.primaryClientIndustry} industry.
Their ideal client is: "${user.idealClientProfile}".
Their target market location is: "${user.targetLocation}".
Their primary goals for using this AI are: ${user.primaryGoals.join(', ')}.
Their #1 success metric is: "${user.successMetric}".
Examples of their past work: "${user.clientWorkExamples || 'Not provided'}".
[END AGENCY CONTEXT]
`;

      // Fix: Type cast Object.entries to fix "unknown" type errors
      const otherToolHistories = (Object.entries(chatHistories) as [string, ChatMessage[]][])
        .filter(([toolId, history]) => toolId !== selectedTool.id && history.length > 0)
        .map(([toolId, history]) => ({
          toolId,
          lastMessageTimestamp: new Date(history[history.length - 1].timestamp || 0).getTime(),
          history,
        }))
        .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
        .slice(0, 2);

      let sharedContext = `
[START SHARED CONTEXT FROM OTHER TOOLS]
`;
      if (otherToolHistories.length > 0) {
        sharedContext += "Recent activity in other tools (use this for context):\n";
        otherToolHistories.forEach(({ toolId, history }) => {
          const toolName = ALL_TOOLS.find(t => t.id === toolId)?.name || toolId;
          const lastUserPrompt = history.filter(m => m.role === 'user').pop()?.text;
          const lastModelResponse = history.filter(m => m.role === 'model').pop()?.text;
          
          if(lastUserPrompt && lastModelResponse) {
              sharedContext += `- In '${toolName}': The user last asked "${lastUserPrompt.substring(0, 100)}..." and you responded "${lastModelResponse.substring(0, 150)}...".\n`;
          }
        });
      }
      sharedContext += "[END SHARED CONTEXT]\n\n";

      let personalizedSystemInstruction = `${userContext}\n${sharedContext}\n${selectedTool.systemInstruction || ''}`;
      
      const userMessageParts: ( {text: string} | {inlineData: {mimeType: string, data: string}} )[] = [];
      
      if (prompt) {
          userMessageParts.push({ text: prompt });
      }

      if (file) {
          const base64Data = await fileToBase64(file);
          userMessageParts.push({
              inlineData: {
                  mimeType: file.type,
                  data: base64Data
              }
          });
      }
      
      const contents = [
        ...currentChatHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })),
        { role: 'user' as const, parts: userMessageParts }
      ];

      // Use centralized AI model configuration
      const response = await ai.models.generateContent({
        model: AI_MODELS.text.advanced,
        contents: contents,
        config: { systemInstruction: personalizedSystemInstruction }
      });

      onUseTool(selectedTool.id, prompt || `File: ${file?.name}`, response.text);
      setPrompt('');
      setFile(null);
    } catch (e: any) {
      console.error(e);
      setError(`An error occurred: ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(index);
    setTimeout(() => setCopiedResponse(null), 2000);
  };
  
  const handleSetSatisfaction = (index: number, satisfaction: 'satisfied' | 'unsatisfied') => {
    onSetSatisfaction(selectedTool.id, index, satisfaction);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-white flex flex-col relative overflow-hidden">
      {user?.themeMode === 'dark' && <HexGridBackground />}

      <header className="relative z-40 bg-white/80 dark:bg-black/50 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className={`p-2.5 bg-gradient-to-br ${selectedTool.gradient} rounded-lg text-white`}>
              {selectedTool.icon}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-30 flex-grow flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-orbitron">{selectedTool.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">{selectedTool.description}</p>
        </div>

        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6 pb-4">
          {currentChatHistory.map((msg, index) => (
            <div key={index} className={`flex gap-2 sm:gap-4 animate-slideInUp ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className={`p-2.5 h-fit bg-gradient-to-br ${selectedTool.gradient} rounded-lg text-white`}>
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
              <div className={`w-full max-w-xl p-4 border rounded-xl ${msg.role === 'model' ? 'bg-white border-gray-200 text-gray-800 dark:bg-black/40 dark:border-brand-violet/20 dark:text-gray-300' : 'bg-violet-100 border-violet-200 text-violet-900 dark:bg-brand-royal-blue/20 dark:border-brand-royal-blue/20 dark:text-white'}`}>
                {msg.role === 'user' && msg.text.startsWith('File:') ? (
                    <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        <span>{msg.text}</span>
                    </div>
                ) : msg.role === 'user' ? (
                    <p>{msg.text}</p>
                ) : (
                  <FormattedResponse text={msg.text} />
                )}
                
                {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mt-3 -mb-1 border-t border-gray-200 dark:border-white/10 pt-2">
                        <button onClick={() => handleCopy(msg.text, index)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors" title="Copy response">
                            {copiedResponse === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                         <button onClick={() => handleSetSatisfaction(index, 'satisfied')} className={`p-2 rounded-md transition-colors ${msg.satisfaction === 'satisfied' ? 'text-green-500 bg-gray-100 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`} title="Good response">
                            <ThumbsUp className="w-4 h-4" />
                        </button>
                         <button onClick={() => handleSetSatisfaction(index, 'unsatisfied')} className={`p-2 rounded-md transition-colors ${msg.satisfaction === 'unsatisfied' ? 'text-red-500 bg-gray-100 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`} title="Bad response">
                            <ThumbsDown className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDownload(msg.text, index)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors"
                            title="Download response"
                        >
                            {savingState?.index === index ? (
                                savingState.status === 'saving' ? <Loader className="w-4 h-4 animate-spin" /> :
                                savingState.status === 'saved' ? <Check className="w-4 h-4 text-green-500" /> :
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800/80 border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center flex-shrink-0 rounded-full">
                  <span className="text-gray-900 dark:text-white font-bold">{user?.name?.[0]}</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-4 animate-slideInUp">
                <div className={`p-2.5 h-fit bg-gradient-to-br ${selectedTool.gradient} rounded-lg text-white`}>
                    <AILoader className="w-5 h-5" />
                </div>
                <div className="w-full max-w-xl p-4 border bg-white dark:bg-black/40 border-gray-200 dark:border-brand-violet/20 text-gray-500 dark:text-gray-400 rounded-xl">
                    <span className="font-mono">ANALYZING...</span>
                </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="relative z-40 mt-auto flex-shrink-0 bg-white/80 dark:bg-black/50 backdrop-blur-md border-t border-gray-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500 text-red-600 dark:text-red-300 text-sm p-3 mb-4 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
           {promptExamples.length > 0 && currentChatHistory.length === 0 && (
             <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar scroll-snap-x-mandatory scroll-pl-4">
              {promptExamples.map((ex, i) => (
                <button 
                  key={i} 
                  onClick={() => setPrompt(ex)}
                  className="flex-shrink-0 px-4 py-2 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors scroll-snap-align-start rounded-full"
                >
                  {ex}
                </button>
              ))}
             </div>
           )}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="Enter directive... (Shift+Enter for newline)"
              className="w-full bg-white dark:bg-black/50 border-2 border-gray-200 dark:border-white/10 p-4 pl-12 pr-20 sm:pl-14 sm:pr-24 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-all font-mono rounded-xl max-h-36"
              rows={1}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Attach file">
                    <Paperclip className="w-5 h-5" />
                 </button>
            </div>
            <button onClick={handleGenerate} disabled={isLoading || (!prompt.trim() && !file)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-brand-violet to-brand-royal-blue p-3 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-violet/50 transition-all rounded-lg">
              <Send className="w-5 h-5" />
            </button>
          </div>
           {file && (
                <div className="flex items-center justify-between mt-2 px-3 py-1 bg-gray-200 dark:bg-white/10 text-sm rounded-md">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                    </div>
                    <button onClick={() => setFile(null)} className="p-1 hover:bg-gray-300 dark:hover:bg-white/20 rounded-full">
                        <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            )}
        </div>
      </footer>
    </div>
  );
};

export default ToolPage;
