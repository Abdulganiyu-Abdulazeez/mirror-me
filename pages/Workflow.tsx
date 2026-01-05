
import React from 'react';

const Workflow: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-12">
      <header className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Inside MirrorMe</h2>
        <p className="text-xl text-slate-400 italic">"Architecture of reflection, logic of anonymity."</p>
      </header>

      <section className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">1</span>
              The User Journey
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li className="flex gap-3">
                <span className="text-indigo-500 font-bold">Registration:</span>
                Users create a secure profile via the SPA auth module.
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-500 font-bold">Link Generation:</span>
                Unique UUID-based links are generated for specific "Anonymous Prompts".
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-500 font-bold">Interaction:</span>
                Friends (the public) submit reflections via text or encrypted voice streams.
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-500 font-bold">Visualization:</span>
                The owner views feedback on a glass-themed dashboard.
              </li>
            </ul>
          </div>
          <div className="glass p-8 rounded-3xl border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full" />
            <div className="space-y-4 relative z-10 font-mono text-xs text-indigo-400">
              <div>// Workflow Diagram</div>
              <div className="pl-4 border-l border-white/10">
                [Account] -> [Generate Link] <br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Public Link]<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Text/Voice Payload]<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[LocalStorage Store]<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Gemini AI Analysis]
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/10">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm">2</span>
            Technical Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <TechBlock 
              title="Frontend" 
              desc="Built with React 19 and TypeScript. Utilizing a declarative component architecture for speed and safety." 
              icon="⚛️"
            />
            <TechBlock 
              title="Persistence" 
              desc="Browser-side LocalStorage simulates a relational database for user, message, and link entities." 
              icon="💾"
            />
            <TechBlock 
              title="Intelligence" 
              desc="Google Gemini 3 Flash API powers the 'Mirror Analysis' to extract sentiment and themes from raw text." 
              icon="🧠"
            />
            <TechBlock 
              title="Audio Engine" 
              desc="MediaRecorder API captures raw streams, encoded as WebM and stored as Base64 strings." 
              icon="🎙️"
            />
            <TechBlock 
              title="Design System" 
              desc="Tailwind CSS provides a Glassmorphism aesthetic with high contrast and smooth transitions." 
              icon="🎨"
            />
            <TechBlock 
              title="Routing" 
              desc="React Router handles protected (Dashboard, Admin) and public dynamic paths (Submission links)." 
              icon="🛣️"
            />
          </div>
        </div>
      </section>

      <footer className="mt-20 p-8 glass rounded-3xl text-center border-white/5">
        <h4 className="font-bold text-lg mb-2">MirrorMe Summary</h4>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          MirrorMe is a social psychology experiment in digital form. It bridges the gap between public perception and personal identity by allowing uninhibited communication, verified by AI analysis to ensure insights are actionable and supportive.
        </p>
      </footer>
    </div>
  );
};

const TechBlock = ({ title, desc, icon }: { title: string, desc: string, icon: string }) => (
  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
    <div className="text-2xl mb-3">{icon}</div>
    <h4 className="font-bold text-slate-100 mb-2">{title}</h4>
    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
  </div>
);

export default Workflow;
