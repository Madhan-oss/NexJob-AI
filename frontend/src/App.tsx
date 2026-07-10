import React from 'react';
import { useStore } from './store/useStore';
import Navbar from './components/Navbar';
import ProgressBar from './components/ProgressBar';
import UploadStep from './components/UploadStep';
import AnalysisStep from './components/AnalysisStep';
import GenerationStep from './components/GenerationStep';
import ReviewExportStep from './components/ReviewExportStep';
import Footer from './components/Footer';

export const App: React.FC = () => {
  const { step } = useStore();

  const renderStep = () => {
    switch (step) {
      case 1:
        return <UploadStep />;
      case 2:
        return <AnalysisStep />;
      case 3:
        return <GenerationStep />;
      case 4:
        return <ReviewExportStep />;
      default:
        return <UploadStep />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-warm dark:bg-bg-dark transition-colors duration-300">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Wizard Flow Area */}
      <main className="flex-1 flex flex-col py-6">
        {/* Step Progress indicators */}
        <ProgressBar />

        {/* Step Contents */}
        <div className="flex-1 flex flex-col justify-start">
          {renderStep()}
        </div>
      </main>

      {/* Footer copyright and sandboxing policy details */}
      <Footer />
    </div>
  );
};

export default App;
