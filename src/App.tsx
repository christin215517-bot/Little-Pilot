import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane as PlaneIcon, 
  Map as MapIcon, 
  Settings, 
  ArrowLeft, 
  Play, 
  RotateCcw, 
  ChevronRight,
  ChevronLeft,
  Cloud,
  Wind,
  Sun,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CITIES, PLANES } from './constants';
import { City, Plane, CityId, UserStats } from './types';
import { generateStory, generateSpeech, generateStoryImage } from './services/geminiService';
import { audioService } from './services/audioService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_8px_0_rgb(67,56,202)] active:shadow-none active:translate-y-1',
    secondary: 'bg-white text-indigo-600 border-4 border-indigo-100 hover:bg-indigo-50 shadow-[0_6px_0_rgb(224,231,255)] active:shadow-none active:translate-y-1',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100'
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => {
        if (!disabled) {
          audioService.playClick();
          onClick?.();
        }
      }}
      disabled={disabled}
      className={cn(
        'px-8 py-4 rounded-[2rem] font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-tight',
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <motion.div
    whileHover={onClick ? { scale: 1.02, rotate: 1 } : {}}
    onClick={() => {
      if (onClick) {
        audioService.playClick();
        onClick();
      }
    }}
    className={cn(
      'bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-slate-50 transition-all cursor-pointer',
      className
    )}
  >
    {children}
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'home' | 'select-plane' | 'select-city' | 'take-off' | 'select-words' | 'story'>('home');
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [selectedPlane, setSelectedPlane] = useState<Plane | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [storyPages, setStoryPages] = useState<string[]>([]);
  const [storyImages, setStoryImages] = useState<string[]>([]);
  const [storyAudios, setStoryAudios] = useState<(string | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track current flight session to prevent race conditions in background loading
  const flightSessionRef = React.useRef(0);
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('pilot_stats');
    return saved ? JSON.parse(saved) : { flightCount: 0, visitedCities: [] };
  });

  useEffect(() => {
    localStorage.setItem('pilot_stats', JSON.stringify(stats));
  }, [stats]);

  // Start BGM on first interaction
  useEffect(() => {
    const startAudio = () => {
      audioService.startBGM();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('touchstart', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('touchstart', startAudio);
    return () => {
      window.removeEventListener('click', startAudio);
      window.removeEventListener('touchstart', startAudio);
    };
  }, []);

  // Handle Flight Sound & BGM
  useEffect(() => {
    if (view === 'take-off') {
      audioService.startFlight();
    } else {
      audioService.stopFlight();
    }

    if (view === 'story') {
      audioService.stopBGM();
    } else if (view === 'home' || view === 'select-plane' || view === 'select-city' || view === 'select-words') {
      audioService.startBGM();
    }
  }, [view]);

  // --- Logic ---

  const cityWords = useMemo(() => {
    if (!selectedCity) return [];
    // We want to keep the same 3 words for the duration of the selection view
    return [...selectedCity.words].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [selectedCity?.id]); // Only re-shuffle if the city changes

  const handleStartFlight = () => setView('select-plane');

  const handlePlaneSelect = (plane: Plane) => {
    setSelectedPlane(plane);
    setView('select-city');
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setView('take-off');
    
    // Auto transition from take-off to word selection
    setTimeout(() => {
      setView('select-words');
    }, 3000);
  };

  const handleWordToggle = (word: string) => {
    audioService.speak(word);
    if (selectedWords.includes(word)) {
      setSelectedWords(prev => prev.filter(w => w !== word));
    } else if (selectedWords.length < 2) {
      setSelectedWords(prev => [...prev, word]);
    }
  };

  const handleGenerateStory = async () => {
    if (!selectedPlane || !selectedCity || selectedWords.length < 2) return;
    
    setIsGenerating(true);
    setView('story');
    setCurrentPage(0);
    
    // Increment session ID to cancel any previous background loading
    const currentSessionId = ++flightSessionRef.current;
    
    const planeName = isExpertMode ? selectedPlane.realName : selectedPlane.childName;
    const generatedStory = await generateStory(planeName, selectedCity.name, selectedWords);
    
    // Safety check: if user left the story view while generating
    if (flightSessionRef.current !== currentSessionId) return;

    const pages = generatedStory.split('\n').filter(p => p.trim()).slice(0, 5);
    setStoryPages(pages);
    
    // Update stats
    setStats(prev => ({
      flightCount: prev.flightCount + 1,
      visitedCities: prev.visitedCities.includes(selectedCity.id) 
        ? prev.visitedCities 
        : [...prev.visitedCities, selectedCity.id]
    }));

    // Generate first page immediately to show the story quickly
    const [firstImg, firstAud] = await Promise.all([
      generateStoryImage(pages[0], selectedCity.name),
      generateSpeech(pages[0])
    ]);
    
    // Final session check before setting initial state
    if (flightSessionRef.current !== currentSessionId) return;

    setStoryImages([firstImg]);
    setStoryAudios([firstAud]);
    setIsGenerating(false);
    
    // Auto-read first page
    if (firstAud) {
      audioService.playAudioUrl(firstAud);
    } else {
      audioService.speak(pages[0]);
    }

    // Generate the rest of the pages in the background
    for (let i = 1; i < pages.length; i++) {
      const [img, aud] = await Promise.all([
        generateStoryImage(pages[i], selectedCity.name),
        generateSpeech(pages[i])
      ]);
      
      // ONLY update if we are still in the same flight session
      if (flightSessionRef.current === currentSessionId) {
        setStoryImages(prev => {
          // Double check we aren't appending to a different flight's data
          if (prev.length === i) return [...prev, img];
          return prev;
        });
        setStoryAudios(prev => {
          if (prev.length === i) return [...prev, aud];
          return prev;
        });
      } else {
        break; // Stop background loading if session changed
      }
    }
  };

  const resetFlight = () => {
    flightSessionRef.current++; // Cancel any pending background tasks
    audioService.stopAll();
    setSelectedPlane(null);
    setSelectedCity(null);
    setSelectedWords([]);
    setStoryPages([]);
    setStoryImages([]);
    setStoryAudios([]);
    setCurrentPage(0);
    setView('home');
  };

  // --- Views ---

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="max-w-4xl mx-auto space-y-10"
    >
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Little Pilot</h1>
          <p className="text-indigo-500 font-black text-xl">Ready for takeoff, Captain!</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-full shadow-lg border-4 border-indigo-50 flex items-center gap-3">
            <PlaneIcon className="w-6 h-6 text-indigo-500 animate-bounce" />
            <span className="font-black text-xl text-slate-700">{stats.flightCount}</span>
          </div>
          <button 
            onClick={() => setIsExpertMode(!isExpertMode)}
            className={cn(
              "p-3 rounded-2xl transition-all shadow-md",
              isExpertMode ? "bg-indigo-500 text-white" : "bg-white text-slate-400 border-2 border-slate-100"
            )}
          >
            <Settings className="w-7 h-7" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-violet-600 border-none p-12 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-10 left-10 animate-pulse"><Sun className="w-20 h-20 text-white" /></div>
             <div className="absolute bottom-10 right-10 animate-bounce"><Cloud className="w-32 h-32 text-white" /></div>
          </div>
          
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30"
          >
            <PlaneIcon className="w-16 h-16 text-white" />
          </motion.div>
          
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white uppercase tracking-tight">New Adventure!</h2>
            <p className="text-indigo-100 text-xl font-medium max-w-md">Fly your favorite plane to magical cities!</p>
          </div>
          
          <Button onClick={handleStartFlight} className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-[0_8px_0_rgb(224,231,255)] px-16 py-6 text-2xl">
            Let's Go!
          </Button>
        </Card>

        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <MapIcon className="w-7 h-7 text-indigo-500" />
            My World
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {CITIES.map(city => (
              <motion.div 
                key={city.id}
                whileHover={{ scale: 1.05, rotate: -2 }}
                className={cn(
                  "p-6 rounded-[2rem] border-4 flex flex-col items-center gap-3 transition-all shadow-lg",
                  stats.visitedCities.includes(city.id) 
                    ? "bg-white border-indigo-100" 
                    : "bg-slate-100 border-slate-200 grayscale opacity-40"
                )}
              >
                <span className="text-4xl">{city.icon}</span>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">{city.name}</span>
                {stats.visitedCities.includes(city.id) && (
                  <div className="bg-emerald-500 p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Cloud className="w-7 h-7 text-indigo-500" />
            Pilot Log
          </h3>
          <Card className="space-y-6 p-10 bg-white border-indigo-50">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold text-lg">Cities Visited</span>
              <span className="font-black text-3xl text-indigo-600">{stats.visitedCities.length} / {CITIES.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border-4 border-slate-50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.visitedCities.length / CITIES.length) * 100}%` }}
                className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full" 
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            <div className="p-4 bg-indigo-50 rounded-2xl text-center">
               <p className="text-indigo-600 font-black italic">"You are a great pilot!"</p>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );

  const renderPlaneSelection = () => (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-5xl mx-auto space-y-10"
    >
      <header className="flex items-center gap-6">
        <button onClick={() => setView('home')} className="p-4 bg-white shadow-md rounded-2xl hover:bg-slate-50 transition-all">
          <ArrowLeft className="w-8 h-8 text-slate-600" />
        </button>
        <h1 className="text-4xl font-black text-slate-900 uppercase italic">Pick Your Plane</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {PLANES.map(plane => (
          <Card 
            key={plane.id} 
            onClick={() => handlePlaneSelect(plane)}
            className={cn(
              "flex flex-col items-center gap-6 p-10 relative group",
              selectedPlane?.id === plane.id ? "border-indigo-500 ring-8 ring-indigo-50" : "hover:border-indigo-200"
            )}
          >
            <div className={cn(
              "transition-all duration-500 group-hover:rotate-12",
              plane.size === 'small' ? 'scale-75' : 
              plane.size === 'medium' ? 'scale-100' : 
              plane.size === 'large' ? 'scale-125' : 'scale-150',
              plane.color
            )}>
              <PlaneIcon className="w-16 h-16 drop-shadow-lg" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-xl text-slate-900 leading-tight">
                {isExpertMode ? plane.realName : plane.childName}
              </p>
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-full">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  {plane.size.replace('-', ' ')}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );

  const renderCitySelection = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="flex items-center gap-4">
        <button onClick={() => setView('select-plane')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Where to fly?</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CITIES.map(city => (
          <Card 
            key={city.id} 
            onClick={() => handleCitySelect(city)}
            className={cn(
              "flex items-center gap-6 p-8",
              city.color,
              selectedCity?.id === city.id && "ring-2 ring-indigo-500"
            )}
          >
            <span className="text-5xl">{city.icon}</span>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">{city.name}</h3>
              <p className="text-slate-500 font-medium">{city.theme}</p>
            </div>
            <ChevronRight className="ml-auto w-6 h-6 text-slate-400" />
          </Card>
        ))}
      </div>
    </motion.div>
  );

  const renderTakeOff = () => {
    if (!selectedPlane || !selectedCity) return null;
    
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-sky-400 to-blue-500 flex flex-col items-center justify-center z-50 overflow-hidden">
        <motion.div
          initial={{ y: 400, opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{ 
            y: [-200, -800], 
            opacity: [1, 1, 0],
            scale: [1, 2, 3],
            rotate: [-15, -30]
          }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className={cn("relative", selectedPlane.color)}
        >
          <PlaneIcon className="w-64 h-64 text-current drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]" />
          
          {/* Engine Fire/Smoke */}
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.2 }}
            className="absolute -bottom-10 left-1/4 w-12 h-24 bg-orange-500 rounded-full blur-xl"
          />
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.2, delay: 0.1 }}
            className="absolute -bottom-10 right-1/4 w-12 h-24 bg-yellow-400 rounded-full blur-xl"
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-20 text-center space-y-6"
        >
          <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase drop-shadow-lg">To the Sky!</h2>
          <div className="bg-white/20 backdrop-blur-md px-8 py-3 rounded-full border-2 border-white/30">
             <p className="text-white font-black text-2xl uppercase tracking-widest">Flying to {selectedCity.name}...</p>
          </div>
        </motion.div>

        {/* Animated Clouds and Stars */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: i % 2 === 0 ? -300 : 1500, y: 80 * i }}
            animate={{ x: i % 2 === 0 ? 1500 : -300 }}
            transition={{ duration: 3 + Math.random() * 2, delay: i * 0.1, repeat: Infinity, ease: "linear" }}
            className="absolute text-white/30"
          >
            {i % 3 === 0 ? <Cloud className="w-32 h-32" /> : <div className="w-4 h-4 bg-white rounded-full blur-sm" />}
          </motion.div>
        ))}
      </div>
    );
  };

  const renderWordSelection = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        className="max-w-3xl mx-auto text-center space-y-12 py-12"
      >
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Magic Words!</h1>
          <p className="text-indigo-600 text-2xl font-black">Pick 2 words to start your story!</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {cityWords.map((word, idx) => (
            <motion.button
              key={word}
              whileHover={{ scale: 1.1, rotate: idx % 2 === 0 ? 5 : -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleWordToggle(word)}
              className={cn(
                "px-12 py-10 rounded-[3rem] text-4xl font-black transition-all border-8",
                selectedWords.includes(word)
                  ? "bg-indigo-500 text-white border-indigo-200 shadow-[0_12px_0_rgb(67,56,202)] -translate-y-2"
                  : "bg-white text-slate-700 border-slate-100 shadow-[0_8px_0_rgb(241,245,249)]"
              )}
            >
              {word}
            </motion.button>
          ))}
        </div>

        <div className="pt-12">
          <Button 
            onClick={handleGenerateStory} 
            disabled={selectedWords.length < 2}
            className="px-20 py-8 text-3xl rounded-full shadow-[0_12px_0_rgb(67,56,202)]"
          >
            Go! <Play className="w-10 h-10 fill-current" />
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderStory = () => (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 py-4"
    >
      <Card className="p-0 overflow-hidden border-none shadow-2xl bg-white min-h-[600px] flex flex-col">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-8">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className={cn("p-8 rounded-full bg-indigo-100", selectedPlane?.color)}
            >
              <PlaneIcon className="w-24 h-24" />
            </motion.div>
            <div className="space-y-3 text-center">
               <p className="text-4xl font-black text-slate-800 animate-pulse uppercase italic">Making your book...</p>
               <p className="text-indigo-500 font-bold text-xl">Drawing pictures for you!</p>
            </div>
          </div>
        ) : (
          <>
            {/* Story Content Area */}
            <div className="flex-1 flex flex-col md:flex-row">
              {/* Left Side: Image */}
              <div className="w-full md:w-1/2 bg-slate-50 relative min-h-[300px] md:min-h-full">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    src={storyImages[currentPage]}
                    alt="Story illustration"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border-2 border-indigo-100 shadow-sm">
                  <span className="font-black text-indigo-600 uppercase text-sm tracking-widest">Page {currentPage + 1} / {storyPages.length}</span>
                </div>
              </div>

              {/* Right Side: Text */}
              <div className="w-full md:w-1/2 p-12 flex flex-col justify-center items-center text-center space-y-12 bg-gradient-to-br from-white to-indigo-50/20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8 cursor-pointer group"
                    onClick={() => {
                      const audioUrl = storyAudios[currentPage];
                      if (audioUrl) {
                        audioService.playAudioUrl(audioUrl);
                      } else {
                        audioService.speak(storyPages[currentPage]);
                      }
                    }}
                  >
                    <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                      <Volume2 className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-5xl md:text-6xl font-black text-slate-900 leading-tight tracking-tight">
                      {storyPages[currentPage]}
                    </p>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Tap to listen</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Bar */}
            <div className="bg-slate-50 border-t-4 border-slate-100 p-8 flex items-center justify-between">
              <Button 
                variant="secondary" 
                onClick={() => {
                  if (currentPage > 0) {
                    const prevPage = currentPage - 1;
                    setCurrentPage(prevPage);
                    const audioUrl = storyAudios[prevPage];
                    if (audioUrl) {
                      audioService.playAudioUrl(audioUrl);
                    } else {
                      audioService.speak(storyPages[prevPage]);
                    }
                  } else {
                    resetFlight();
                  }
                }}
                className="px-8 py-4 text-xl shadow-[0_6px_0_rgb(224,231,255)]"
              >
                {currentPage === 0 ? <RotateCcw className="w-6 h-6" /> : <ChevronLeft className="w-8 h-8" />}
                {currentPage === 0 ? 'Home' : 'Back'}
              </Button>

              <div className="flex gap-2">
                {storyPages.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      currentPage === idx ? "bg-indigo-500 w-8" : "bg-slate-300"
                    )}
                  />
                ))}
              </div>

              {currentPage < storyPages.length - 1 ? (
                <Button 
                  disabled={storyImages.length <= currentPage + 1}
                  onClick={() => {
                    const nextPage = currentPage + 1;
                    setCurrentPage(nextPage);
                    const audioUrl = storyAudios[nextPage];
                    if (audioUrl) {
                      audioService.playAudioUrl(audioUrl);
                    } else {
                      audioService.speak(storyPages[nextPage]);
                    }
                  }}
                  className="px-10 py-4 text-xl shadow-[0_8px_0_rgb(67,56,202)]"
                >
                  {storyImages.length <= currentPage + 1 ? 'Loading...' : 'Next'} 
                  {storyImages.length <= currentPage + 1 ? null : <ChevronRight className="w-8 h-8" />}
                </Button>
              ) : (
                <Button 
                  variant="secondary"
                  onClick={resetFlight}
                  className="px-10 py-4 text-xl shadow-[0_6px_0_rgb(224,231,255)] border-emerald-100 text-emerald-600"
                >
                  The End! <CheckCircle2 className="w-6 h-6" />
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#EEF2FF] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <main className="container mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderHome()}
            </motion.div>
          )}
          {view === 'select-plane' && (
            <motion.div key="select-plane" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderPlaneSelection()}
            </motion.div>
          )}
          {view === 'select-city' && (
            <motion.div key="select-city" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderCitySelection()}
            </motion.div>
          )}
          {view === 'take-off' && (
            <motion.div key="take-off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderTakeOff()}
            </motion.div>
          )}
          {view === 'select-words' && (
            <motion.div key="select-words" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderWordSelection()}
            </motion.div>
          )}
          {view === 'story' && (
            <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderStory()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Playful Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-200 rounded-full blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-200 rounded-full blur-[120px] opacity-30 animate-pulse delay-700" />
        
        {/* Floating Bubbles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: "110%", 
              scale: Math.random() * 0.5 + 0.5 
            }}
            animate={{ 
              y: "-10%",
              x: (Math.random() * 100) + (Math.sin(i) * 10) + "%"
            }}
            transition={{ 
              duration: 15 + Math.random() * 20, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10
            }}
            className="absolute w-12 h-12 bg-white/40 rounded-full blur-sm border border-white/20"
          />
        ))}
      </div>
    </div>
  );
}
