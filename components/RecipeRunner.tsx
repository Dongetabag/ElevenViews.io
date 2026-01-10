import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, Recipe, Tool } from '../types.ts';
import { ArrowLeft, Play, AILoader, Check, AlertTriangle, Layers, X, Copy, Save, Loader } from './icons.tsx';
import HexGridBackground from './HexGridBackground.tsx';
import { ALL_TOOLS } from '../constants.tsx';

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

const FormattedResponse: React.FC<{ text: string }> = ({ text }) => {
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts = text.split(codeBlockRegex);

  return (
    <div>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const codeContent = part.split('\n').slice(1).join('\n');
          return (
            <pre key={index} className="bg-gray-100 dark:bg-black/50 p-3 font-mono text-sm my-2 block overflow-x-auto border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-300">
              <code>{codeContent || part}</code>
            </pre>
          );
        }
        const boldRegex = /\*\*(.*?)\*\*/g;
        const lines = part.split('\n').map((line, lineIndex) => {
          if (line.trim() === '') return null;
          if (line.startsWith('# ')) return <h1 key={`${index}-${lineIndex}`} className="text-xl font-bold my-3 pt-2 font-mono text-gray-900 dark:text-white">{line.substring(2)}</h1>;
          if (line.startsWith('## ')) return <h2 key={`${index}-${lineIndex}`} className="text-lg font-semibold my-2 pt-1 font-mono text-gray-900 dark:text-white">{line.substring(3)}</h2>;
          if (line.trim().startsWith('- ')) {
            const content = line.trim().substring(2);
            const formattedContent = content.split(boldRegex).map((subPart, i) =>
              i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{subPart}</strong> : subPart
            );
            return <li key={`${index}-${lineIndex}`}>{formattedContent}</li>;
          }
          const formattedLine = line.split(boldRegex).map((subPart, i) =>
            i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{subPart}</strong> : subPart
          );
          return <p key={`${index}-${lineIndex}`} className="my-1">{formattedLine}</p>;
        }).filter(Boolean);

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

interface RecipeRunnerProps {
  user: UserProfile | null;
  selectedRecipe: Recipe;
  onNavigate: (page: 'dashboard') => void;
  onUseTool: (toolId: string, userPrompt: string, modelResponse: string) => void;
}

const RecipeRunner: React.FC<RecipeRunnerProps> = ({ user, selectedRecipe, onNavigate, onUseTool }) => {
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
        outputRef.current.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [finalOutput, isRunning, error, currentStep]);

  const steps = selectedRecipe.toolIds.map(id => ALL_TOOLS.find(t => t.id === id)).filter((t): t is Tool => !!t);

  const handleRunRecipe = async () => {
    if (!initialPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setCurrentStep(0);
    setError(null);
    setFinalOutput(null);

    let accumulatedContext = '';
    
    const userContext = user ? `
[START AGENCY CONTEXT - "YOUR RECIPE"]
The user's agency core competency is: ${user.agencyCoreCompetency}.
Their brand voice is: "${user.agencyBrandVoice}".
They primarily work with clients in the ${user.primaryClientIndustry} industry.
Their ideal client is: "${user.idealClientProfile}".
Their target market location is: "${user.targetLocation}".
Their #1 success metric is: "${user.successMetric}".
[END AGENCY CONTEXT]
` : '';

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      const currentTool = steps[i];
      try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });
        const promptForThisStep = `
          ${userContext}

          **OVERALL GOAL:**
          "${initialPrompt}"

          **CONTEXT FROM PREVIOUS STEPS:**
          ${accumulatedContext ? accumulatedContext : "This is the first step. Base your analysis on the overall goal."}

          ---

          **YOUR CURRENT TASK:**
          You are the "${currentTool.name}" tool. Your purpose is: "${currentTool.description}".
          Based on the goal and prior context, generate your response. Your output will inform the next step.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptForThisStep,
            ...(currentTool.systemInstruction && { config: { systemInstruction: currentTool.systemInstruction }})
        });

        const newOutput = response.text;
        accumulatedContext += `\n\n--- Output from ${currentTool.name} ---\n${newOutput}`;
        onUseTool(currentTool.id, `Recipe Step: ${currentTool.name}`, newOutput);
      } catch (e: any) {
        console.error(e);
        const errorMessage = `Error at step "${currentTool.name}": ${e.message || 'An unknown error occurred.'}`;
        setError(errorMessage);
        setIsRunning(false);
        return;
      }
    }

    setCurrentStep(steps.length);
    const consolidationPrompt = `
      You are an expert report synthesizer. Your task is to combine the outputs from a multi-step AI workflow into a single, cohesive, and professionally formatted final report that directly addresses the user's original goal.

      **ORIGINAL GOAL:**
      "${initialPrompt}"

      **WORKFLOW OUTPUTS:**
      ${accumulatedContext}

      ---

      **YOUR TASK:**
      Synthesize all information into a single, comprehensive report. Structure it logically with clear markdown headings. Do not just list the outputs; create a coherent, unified document.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });
        const finalResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: consolidationPrompt,
            config: { systemInstruction: "You are an expert editor and report writer." }
        });
        setFinalOutput(finalResponse.text);
    } catch(e: any) {
        console.error("Final consolidation failed", e);
        setError("Failed to generate the final report, but individual step outputs are available below.");
        setFinalOutput(accumulatedContext);
    } finally {
        setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!finalOutput) return;
    navigator.clipboard.writeText(finalOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!finalOutput) return;
    setSavingState('saving');
    try {
        const blob = new Blob([finalOutput], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ElevenViews-${selectedRecipe.name.replace(/\s/g, '_')}-${new Date().toISOString()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSavingState('saved');
        setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
        console.error("Download failed", err);
        setError("Could not prepare the file for download.");
        setSavingState('error');
        setTimeout(() => setSavingState('idle'), 3000);
    }
  };

  const StepStatus = ({ stepIndex }: { stepIndex: number }) => {
    if (currentStep > stepIndex || (!isRunning && finalOutput)) return <div className="w-6 h-6 flex items-center justify-center bg-green-500 rounded-full"><Check className="w-4 h-4 text-black" /></div>;
    if (currentStep === stepIndex && isRunning) return <div className="w-6 h-6 flex items-center justify-center bg-brand-violet rounded-full"><AILoader className="w-4 h-4 text-white" /></div>;
    if (error && currentStep === stepIndex) return <div className="w-6 h-6 flex items-center justify-center bg-red-500 rounded-full"><AlertTriangle className="w-4 h-4 text-black" /></div>;
    return <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col relative overflow-hidden">
      {user?.themeMode === 'dark' && <HexGridBackground />}
      <header className="relative z-40 bg-white/80 dark:bg-black/50 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className={`p-2.5 bg-gradient-to-br ${selectedRecipe.gradient} rounded-lg text-white`}>
              {selectedRecipe.icon}
            </div>
          </div>
        </div>
      </header>
      
      <main className="relative z-30 flex-grow flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <aside className="w-full lg:w-1/3 p-4 sm:p-6 lg:py-8 lg:pr-8 border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-white/10 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-orbitron">{selectedRecipe.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm mb-8">{selectedRecipe.description}</p>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <StepStatus stepIndex={index} />
                  <div className={`flex items-center gap-3 transition-opacity ${currentStep > index || (!isRunning && finalOutput) ? 'opacity-100' : currentStep === index ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`p-2 bg-gradient-to-br ${step.gradient} rounded-md text-white`}>{React.cloneElement(step.icon, {className: 'w-5 h-5'})}</div>
                    <span className="font-semibold text-gray-900 dark:text-white">{step.name}</span>
                  </div>
                </div>
              ))}
            </div>
        </aside>

        <div className="w-full lg:w-2/3 p-4 sm:p-6 lg:py-8 lg:pl-8 flex flex-col flex-grow">
            {currentStep === -1 && !finalOutput && (
                <div className="flex flex-col h-full flex-grow animate-fadeIn">
                    <label htmlFor="initial-prompt" className="text-sm font-mono text-gray-500 dark:text-gray-400 tracking-widest mb-2">INITIAL DIRECTIVE</label>
                    <textarea
                        id="initial-prompt"
                        value={initialPrompt}
                        onChange={(e) => setInitialPrompt(e.target.value)}
                        placeholder="e.g., Create a complete marketing strategy for a new brand of eco-friendly coffee subscription boxes targeting millennials."
                        className="w-full flex-grow bg-white dark:bg-black/50 border-2 border-gray-200 dark:border-white/10 p-4 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-brand-violet focus:border-brand-violet transition-all font-mono rounded-xl"
                    />
                    <button onClick={handleRunRecipe} disabled={!initialPrompt.trim()} className="mt-4 w-full flex justify-center items-center gap-3 px-6 py-4 bg-gradient-to-r from-brand-neon-green to-brand-aqua text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-neon-green/50 transform hover:scale-105 transition-all duration-200 rounded-xl">
                        <Play className="w-5 h-5" />
                        <span className="font-orbitron tracking-widest">RUN RECIPE</span>
                    </button>
                </div>
            )}
            
            {(isRunning || finalOutput || error) && (
                <div ref={outputRef} className="flex-grow overflow-y-auto pr-2 -mr-4">
                    {isRunning && currentStep < steps.length && (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                            <AILoader className="w-12 h-12 text-brand-violet mb-4" />
                            <h2 className="text-xl font-bold font-orbitron text-gray-900 dark:text-white">Executing Step {currentStep + 1} of {steps.length}</h2>
                            <p className="text-gray-500 dark:text-gray-400">Running "{steps[currentStep].name}"...</p>
                        </div>
                    )}
                    {isRunning && currentStep === steps.length && (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                            <AILoader className="w-12 h-12 text-brand-neon-green mb-4" />
                            <h2 className="text-xl font-bold font-orbitron text-gray-900 dark:text-white">Synthesizing Report</h2>
                            <p className="text-gray-500 dark:text-gray-400">Compiling results into a final document...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 text-red-600 dark:text-red-300 animate-fadeIn rounded-xl">
                            <h3 className="font-bold mb-2 flex items-center gap-2"><AlertTriangle/>Error during execution</h3>
                            <p className="font-mono text-sm">{error}</p>
                        </div>
                    )}
                    
                    {finalOutput && (
                        <div className="animate-fadeIn">
                             <div className="flex justify-between items-center mb-4">
                               <h3 className="text-xl font-bold font-orbitron text-gray-900 dark:text-white">Final Report</h3>
                               <div className="flex items-center gap-2">
                                  <button onClick={handleCopy} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors" title="Copy report">
                                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                  <button onClick={handleDownload} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors" title="Download report">
                                      {savingState === 'saving' ? <Loader className="w-4 h-4 animate-spin" /> :
                                       savingState === 'saved' ? <Check className="w-4 h-4 text-green-500" /> :
                                       savingState === 'error' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                                       <Save className="w-4 h-4" />}
                                  </button>
                               </div>
                             </div>
                             <div className="p-6 bg-white dark:bg-black/40 border border-gray-200 dark:border-brand-violet/20 text-gray-800 dark:text-gray-300 rounded-xl">
                                <FormattedResponse text={finalOutput} />
                             </div>
                             <button onClick={() => { setFinalOutput(null); setInitialPrompt(''); setCurrentStep(-1); setError(null); }} className="mt-4 w-full flex justify-center items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all rounded-xl">
                                Run New Recipe
                             </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default RecipeRunner;